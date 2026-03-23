# Production deployment guide

This guide prepares the Bjørnevatn IL monorepo for a single-server Docker deployment on a Linux VM behind a Cloudflare Tunnel. The setup keeps the existing split between:

- `apps/web` — Next.js frontend
- `apps/api` — NestJS API
- PostgreSQL — containerized database

It is intentionally practical for a single production server and keeps the deployment flow close to the current stack.

## 1. What this deployment stack does

Production deployment uses `infra/docker-compose.prod.yml` with three always-on services:

- `db` — PostgreSQL 16
- `api` — NestJS production runtime
- `web` — Next.js production runtime

There is also one manual ops-only service:

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

## 3. Environment strategy: config vs secrets

Production now uses two untracked runtime files on the server:

1. `.env` at the repo root for non-secret runtime configuration
2. `infra/.env.server` for secret-only values

The tracked templates are:

- `infra/.env.example` — non-secret config template
- `infra/.env.server.example` — secret-only template

### Step A — create the non-secret config file

```bash
cp infra/.env.example .env
```

This file should contain safe values such as URLs, ports, flags, logging, and other non-secret runtime configuration.

### Step B — create the secret-only file

```bash
cp infra/.env.server.example infra/.env.server
chmod 600 infra/.env.server
```

This file should contain credentials, secrets, and bootstrap passwords only.

### What belongs where

| Location            | Purpose                    | Variables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env`              | Non-secret runtime config  | `NODE_ENV`, `DEPLOY_ENV`, `APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_PATH`, `INTERNAL_API_URL`, `WEB_PORT`, `API_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `API_CORS_ORIGINS`, `TRUST_PROXY`, `NEXT_PUBLIC_CSRF_COOKIE_NAME`, `REGISTRATION_ENABLED`, `NEXT_PUBLIC_REGISTRATION_ENABLED`, `MEDIA_STORAGE_PROVIDER`, `NEXT_PUBLIC_CSP_MEDIA_ORIGINS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM`, `LOG_LEVEL`, `METRICS_ALLOWLIST`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `OTEL_SERVICE_NAMESPACE`, `PUBLIC_SUBMISSION_CHALLENGE_TOKEN`, `TICKET_ORDER_LOOKUP_TOKEN_TTL_MS`, `LIVE_UPLOADS_PATH`, `STAGING_UPLOADS_PATH`, `STAGING_SYNC_SCRIPT_PATH` |
| `infra/.env.server` | Secret-only runtime values | `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_PASSWORD`, `SMTP_PASS`, `TICKET_QR_SECRET`, `TICKET_ORDER_LOOKUP_SECRET`, `LIVE_DATABASE_URL`, `STAGING_DATABASE_URL`, `STAGING_PUSH_CONFIRMATION_TOKEN`                                                                                                                                                                                                                                                                                                                                                                                                              |

### Secret classification

These values are secrets and must exist only on the server, in a proper server-side secret store, or in GitHub environment secrets where explicitly noted:

- `DATABASE_URL`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `SMTP_PASS` (this repo's SMTP password variable; treat it as the `SMTP_PASSWORD` equivalent)
- `POSTGRES_PASSWORD`
- deploy SSH credentials

### GitHub environment secrets for manual deploy

The manual production deploy workflow requires these GitHub **environment** secrets:

- `SSH_HOST`
- `SSH_PORT`
- `SSH_USER`
- `SSH_PRIVATE_KEY`

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
3. Bootstrap the first admin.
4. Start the API.
5. Start the web app.
6. Attach Cloudflare Tunnel routes.
7. Verify health endpoints.

### Step A — build images

```bash
docker compose -f infra/docker-compose.prod.yml build
```

### Step B — run database only

```bash
docker compose -f infra/docker-compose.prod.yml up -d db
```

Wait until the database health check is healthy:

```bash
docker compose -f infra/docker-compose.prod.yml ps
```

### Step C — apply Prisma migrations safely

Run migrations manually and intentionally:

```bash
docker compose -f infra/docker-compose.prod.yml --profile ops run --rm migrate
```

Notes:

- This uses the existing Prisma migration workflow from the monorepo.
- The API does not auto-run destructive seeding on startup.
- The API already fails fast if migrations are missing.

### Step D — bootstrap the first super admin

Set these values in `infra/.env.server`:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_NAME`
- `BOOTSTRAP_ADMIN_PASSWORD`

Then run:

```bash
docker compose -f infra/docker-compose.prod.yml run --rm --entrypoint node api dist/src/ops/admin-bootstrap.js
```

Behavior:

- creates the first `super_admin` only if none exists
- securely hashes `BOOTSTRAP_ADMIN_PASSWORD`
- does nothing if a `super_admin` already exists
- does not overwrite an existing admin/editor account
- is safe to run more than once

### Step E — start application services

```bash
docker compose -f infra/docker-compose.prod.yml up -d api web
```

### Optional admin password reset utility

If an existing admin or super admin needs a password reset, run:

```bash
ADMIN_RESET_EMAIL=admin@example.com ADMIN_RESET_PASSWORD='replace-with-a-new-strong-password' docker compose -f infra/docker-compose.prod.yml run --rm -e ADMIN_RESET_EMAIL -e ADMIN_RESET_PASSWORD --entrypoint node api dist/src/ops/admin-reset-password.js
```

Behavior:

- only works for `admin` or `super_admin` accounts
- securely hashes the new password
- revokes active sessions for that account after updating the password

### Optional seed flow

Seeding is not automatic in production. If you truly need it for a new environment, run it manually and only when you understand what the seed does:

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

Because browsers still need to reach the API origin defined by `NEXT_PUBLIC_API_URL`, the simplest production setup is to publish two hostnames through Cloudflare Tunnel:

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

- `docker compose -f infra/docker-compose.prod.yml ps` shows `db`, `api`, and `web` healthy
- web homepage loads through the tunnel
- API health endpoints load through the API hostname
- media uploads persist under `data/uploads/`
- canonical URLs and sitemap use `NEXT_PUBLIC_SITE_URL`
- login works with the bootstrapped admin account

## 9. Redeploy / update flow

### Standard redeploy from the server

```bash
git pull --ff-only
docker compose -f infra/docker-compose.prod.yml up -d --build
docker compose -f infra/docker-compose.prod.yml ps
```

### Manual production deploy from GitHub Actions

Workflow file:

- `.github/workflows/deploy-production.yml`

The workflow SSHes into the production server and runs:

```bash
cd ~/apps/bjornevatn-il
git pull --ff-only
docker compose -f infra/docker-compose.prod.yml up -d --build
docker compose -f infra/docker-compose.prod.yml ps
```

This keeps SSH credentials in GitHub environment secrets instead of in the repository and removes routine manual SSH work from normal deploys.

### Rollback basics

1. Restore the previous Git revision or image tag.
2. If a migration introduced an incompatible schema change, restore the database from backup.
3. Re-run the previous application version.
4. If needed, follow the Prisma rollback notes in `docs/DATABASE.md` and `docs/RUNBOOKS/rollback-migration.md`.

## 10. Operational notes and assumptions

### Monorepo / build assumptions

- Package manager: `pnpm`
- Workspace orchestration: Turborepo
- API production runtime: `node dist/src/main.js`
- Web production runtime: `node apps/web/server.js` from Next.js standalone output
- Prisma schema location: `packages/db/prisma/schema.prisma`

### Remaining manual steps before go-live

- choose your real public domains
- generate strong secrets for `JWT_SECRET` and `COOKIE_SECRET`
- set real SMTP credentials if email flows are needed later
- confirm Cloudflare Tunnel ingress rules
- back up `data/postgres/` and `data/uploads/`
- run a final smoke test after deploy
