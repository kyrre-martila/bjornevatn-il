# DEPLOY

Use this guide for production-style deployment of API + web.

## 1) Install and build for production

```bash
pnpm install --frozen-lockfile
pnpm build
```

## 2) Set environment variables

Use `.env.prod.example` as the baseline.

Required minimum:

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `API_CORS_ORIGINS`

Use cryptographically random values for `JWT_SECRET` and `COOKIE_SECRET` (32+ chars, mixed character types).

## 3) Apply database migrations

```bash
pnpm db:migrate
```

## 4) Run production services

Build artifacts must exist before startup.

Start both services from the repo root:

```bash
pnpm start
```

Or start individually:

```bash
pnpm start:api
pnpm start:web
```

If you deploy with containers, you can use:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d
```

## 5) Reverse proxy expectations

Deploy behind a reverse proxy/load balancer that:

- terminates TLS
- forwards `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For`
- routes web traffic to the Next.js service
- routes API traffic to the NestJS service (or preserves `/api` routing)

The provided production compose setup uses Traefik as this proxy layer.

## 6) Database requirements

- PostgreSQL 16-compatible
- network access from API runtime
- `DATABASE_URL` points to the target database/schema
- migrations applied during deploy (`pnpm db:migrate`)
- automated backups and restore process in place


## Authentication deployment notes

- This blueprint currently runs access-token + server-side-session auth (no refresh-token flow).
- Browser clients rely on the HttpOnly `access` cookie; preserve forwarded proto/host headers so secure-cookie behavior is correct behind proxies.
- Session revocation is DB-backed (`Session` table), so API instances must share the same database to keep logout/forced-revoke behavior consistent.

**Implemented vs planned:** refresh-token rotation and third-party OAuth/SSO are planned/customization items, not part of the default runtime behavior.
