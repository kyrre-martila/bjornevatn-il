# DEPLOY

Use this guide for production-style deployment of API + web.

## 1) Build for production

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
- `ENCRYPTION_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `API_CORS_ORIGINS`

## 3) Run API and web

Build artifacts must exist before startup.

API:

```bash
pnpm --filter api start
```

Web:

```bash
pnpm --filter web start
```

If you deploy with containers, you can use:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d
```

## 4) Reverse proxy expectations

Deploy behind a reverse proxy/load balancer that:

- terminates TLS
- forwards `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For`
- routes web traffic to the Next.js service
- routes API traffic to the NestJS service (or preserves `/api` routing)

The provided production compose setup uses Traefik as this proxy layer.

## 5) Database requirements

- PostgreSQL 16-compatible
- network access from API runtime
- `DATABASE_URL` points to the target database/schema
- migrations applied during deploy (`pnpm prisma migrate deploy`)
- automated backups and restore process in place
