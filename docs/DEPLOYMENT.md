# Production deployment guide

This guide prepares the Bjørnevatn IL monorepo for a single-server Docker deployment on a Linux VM behind a Cloudflare Tunnel. The setup keeps the existing split between:

- `apps/web` — Next.js frontend
- `apps/api` — NestJS API
- PostgreSQL — containerized database

It is intentionally practical for a homelab MVP and can be moved to a VPS later with minimal changes.

## 1. What this deployment stack does

Production deployment uses `infra/docker-compose.prod.yml` with three always-on services:

- `db` — PostgreSQL 16
- `api` — NestJS production runtime
- `web` — Next.js production runtime

There is also one **manual ops-only** service:

- `migrate` — runs Prisma `migrate deploy` intentionally, on demand

### Network model

- `web`, `api`, and `db` communicate on a private Docker bridge network.
- Only loopback host ports are published:
  - `127.0.0.1:3000 -> web`
  - `127.0.0.1:4000 -> api`
- This keeps the stack private on the VM while still allowing a host-installed Cloudflare Tunnel to forward traffic to the correct services.

## 2. Prerequisites

Install these on the VM:

- Docker Engine
- Docker Compose plugin
- Cloudflare Tunnel (`cloudflared`) if you are terminating ingress on the host
- Enough disk space for database and uploads under `data/`

From the repo root, create persistent directories:

```bash
mkdir -p data/postgres data/uploads
```

## 3. Environment file

Copy the production example and fill in real values:

```bash
cp .env.example .env.prod
```

### Mandatory variables

These **must** be set before going live:

#### Public URLs

- `APP_URL` — public web origin, used by API-generated links such as password reset links
- `NEXT_PUBLIC_SITE_URL` — public web origin used by Next.js SEO/runtime config
- `NEXT_PUBLIC_API_URL` — public API origin used by browsers, for example `https://api.example.com`
- `NEXT_PUBLIC_API_BASE_PATH` — normally `/api/v1`
- `INTERNAL_API_URL` — internal Docker URL used by the web container, normally `http://api:4000`

#### Database

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`

#### Auth / security

- `JWT_SECRET`
- `COOKIE_SECRET`
- `API_CORS_ORIGINS`

### Recommended variables

- `TRUST_PROXY=1` for Cloudflare Tunnel / reverse-proxy style forwarding
- `MEDIA_STORAGE_PROVIDER=local`
- `LOG_LEVEL=info`
- `METRICS_ALLOWLIST=127.0.0.1/32,::1/128`

### Optional variables

Use only if the corresponding feature is needed:

- `SMTP_*` for outbound email / password reset mail
- `PUBLIC_SUBMISSION_CHALLENGE_TOKEN`
- `TICKET_QR_SECRET`
- `TICKET_ORDER_LOOKUP_SECRET`
- `LIVE_DATABASE_URL`, `STAGING_DATABASE_URL`, `LIVE_UPLOADS_PATH`, `STAGING_UPLOADS_PATH`, `STAGING_*` for the staging sync feature set

## 4. Persistent storage on the VM

This setup uses bind mounts so storage is easy to locate and back up.

### Default host paths

- PostgreSQL data: `data/postgres/`
- Uploaded media and generated files served by the API: `data/uploads/`

Because these are bind-mounted, data survives container rebuilds and restarts.

## 5. Build and startup flow

### Boot order

1. Start PostgreSQL.
2. Run migrations intentionally.
3. Start the API.
4. Start the web app.
5. Attach Cloudflare Tunnel routes.
6. Verify health endpoints.

### Step A — build images

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod build
```

### Step B — run database only

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d db
```

Wait until the database health check is healthy:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod ps
```

### Step C — apply Prisma migrations safely

Run migrations manually and intentionally:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod --profile ops run --rm migrate
```

Notes:

- This uses the existing Prisma migration workflow from the monorepo.
- The API **does not** auto-run destructive seeding on startup.
- The API already fails fast if migrations are missing.

### Step D — start application services

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d api web
```

### Optional seed flow

Seeding is **not automatic** in production. If you truly need it for a new environment, run it manually and only when you understand what the seed does:

```bash
pnpm db:seed
```

Review `scripts/seed.ts` first before using it outside development.

## 6. Health checks and readiness

### Docker health checks

The production compose file defines health checks for:

- `db` — `pg_isready`
- `api` — `GET /health/ready`
- `web` — `GET /api/health?ready=1`

### Useful manual checks

Check the API from the VM:

```bash
curl -fsS http://127.0.0.1:4000/health/live
curl -fsS http://127.0.0.1:4000/health/ready
```

Check the web app from the VM:

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS "http://127.0.0.1:3000/api/health?ready=1"
```

The web readiness endpoint verifies that the Next.js container can also reach the API.

## 7. Cloudflare Tunnel notes

### Recommended routing

Because browsers still need to reach the API origin defined by `NEXT_PUBLIC_API_URL`, the simplest production setup is to publish **two hostnames** through Cloudflare Tunnel:

- `www.example.com` -> `http://localhost:3000`
- `api.example.com` -> `http://localhost:4000`

Example `cloudflared` ingress fragment:

```yaml
ingress:
  - hostname: www.example.com
    service: http://localhost:3000
  - hostname: api.example.com
    service: http://localhost:4000
  - service: http_status:404
```

### Proxy assumptions

- Public HTTPS terminates at Cloudflare.
- Containers only see internal HTTP.
- `TRUST_PROXY=1` is recommended so the API correctly respects forwarded proxy headers in this single-proxy setup.
- `API_CORS_ORIGINS` must include the public web origin(s), for example `https://www.example.com`.

## 8. Production verification checklist

After startup, verify:

- `docker compose ... ps` shows `db`, `api`, and `web` healthy
- Web homepage loads through the tunnel
- API health endpoints load through the API hostname
- Media uploads persist under `data/uploads/`
- Password reset links use `APP_URL`
- Canonical URLs and sitemap use `NEXT_PUBLIC_SITE_URL`

## 9. Redeploy / update flow

### Standard redeploy

```bash
git pull
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod build
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d db
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod --profile ops run --rm migrate
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d api web
```

### Rollback basics

1. Restore the previous Git revision or image tag.
2. If a migration introduced an incompatible schema change, restore the database from backup.
3. Re-run the previous application version.
4. If needed, follow the Prisma rollback notes in `docs/DATABASE.md` and `docs/RUNBOOKS/rollback-migration.md`.

## 10. Operational notes and assumptions

### Monorepo / build assumptions

- Package manager: `pnpm`
- Workspace orchestration: Turborepo
- API production runtime: `node apps/api/dist/src/main.js`
- Web production runtime: `node server.js` from Next.js standalone output
- Prisma schema location: `packages/db/prisma/schema.prisma`

### Remaining manual steps before go-live

- Choose your real public domains
- Generate strong secrets for `JWT_SECRET` and `COOKIE_SECRET`
- Set real SMTP credentials if email flows are needed
- Confirm Cloudflare Tunnel ingress rules
- Back up `data/postgres/` and `data/uploads/`
- Run a final smoke test after DNS / tunnel cutover
