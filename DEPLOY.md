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
- `DEPLOY_ENV=production` (or `staging` for pre-prod)
- `DATABASE_URL`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_API_BASE_PATH` (default `/api/v1`)
- `API_CORS_ORIGINS`
- `REGISTRATION_ENABLED=false`
- `NEXT_PUBLIC_REGISTRATION_ENABLED=false`
- `ALLOW_PUBLIC_REGISTRATION_IN_HARDENED_ENV=false`

Use cryptographically random values for `JWT_SECRET` and `COOKIE_SECRET` (32+ chars, mixed character types).

Public self-registration is disabled by default in this blueprint. For agency/client deployments, keep registration disabled and create users via admin workflows or invitation flows. Even if someone toggles `REGISTRATION_ENABLED=true`, hardened environments (`production`/`staging`) still require `ALLOW_PUBLIC_REGISTRATION_IN_HARDENED_ENV=true` before API registration is accepted.

### Fail-fast startup behavior

- API fails startup when required API secrets/DB env vars are missing.
- API fails startup when `API_CORS_ORIGINS` is missing in hardened environments (`production` and `staging`).
- API fails startup when Prisma migrations are missing or unapplied.
- Web fails build/start in hardened environments when `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_API_URL` is missing/invalid.

## 3) Apply database migrations

```bash
pnpm db:migrate
```

Run migrations before promoting new API/web versions.

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

## 5) Health/readiness and startup ordering

### Health endpoints

- API liveness: `GET /health/live`
- API readiness: `GET /health/ready`
- API compatibility health (same as readiness): `GET /health`
- Web liveness: `GET /api/health`
- Web readiness (API reachability): `GET /api/health?ready=1` (or `GET /api/health?mode=ready`)

### Probe semantics

- **Liveness probe** answers: "should this process be restarted?"
  - Use `GET /health/live`.
  - This endpoint only verifies the API process is up and able to serve requests.
  - It intentionally does **not** check database connectivity.
- **Readiness probe** answers: "can this instance receive production traffic right now?"
  - Use `GET /health/ready` (or `GET /health` for backward compatibility).
  - This endpoint verifies database connectivity with a simple `SELECT 1` query.
  - If the database is unavailable, the endpoint returns HTTP `503` so orchestrators/load balancers stop routing traffic to that instance.

Example Docker health check (readiness-style):

```yaml
services:
  api:
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "fetch('http://127.0.0.1:3001/health/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))",
        ]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 20s
```

### Readiness assumptions

- Database is reachable from API at process start.
- `_prisma_migrations` exists and contains at least one applied migration.
- API CORS allowlist and cookie secrets are configured for the deployed domain(s).
- Web public runtime URLs point at deployed API/web origins.

### Startup ordering

1. Start database.
2. Apply migrations (`pnpm db:migrate`).
3. Start API and wait for `/health/ready` success.
4. Start web and verify `/api/health` (liveness) and `/api/health?ready=1` (API reachability) plus one authenticated admin request.
5. Shift traffic.

## 6) Reverse proxy expectations

Deploy behind a reverse proxy/load balancer that:

- terminates TLS
- forwards `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For`
- routes web traffic to the Next.js service
- routes API traffic to the NestJS service (or preserves `/api` routing)

The provided production compose setup uses Traefik as this proxy layer.

## 7) Cookie + CSRF environment parity

`production` and `staging` are intentionally treated as hardened environments.

| Environment | CSRF fallback token in web middleware           | API auth cookie `Secure`              | API CSRF cookies `Secure`             |
| ----------- | ----------------------------------------------- | ------------------------------------- | ------------------------------------- |
| development | Allowed only for local/test convenience         | Based on request/proxy (`https` only) | Based on request/proxy (`https` only) |
| test/CI     | Allowed (`test-csrf-token`) for test automation | Based on request/proxy                | Based on request/proxy                |
| staging     | Disabled                                        | Always `true`                         | Always `true`                         |
| production  | Disabled                                        | Always `true`                         | Always `true`                         |

This prevents test/dev token shortcuts from silently leaking into staging.


## Production environment matrix

| Variable | API | Web | Required in staging/production | Notes |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | ✅ | ✅ | ✅ | Set to `production` for deployed services. |
| `DEPLOY_ENV` | ✅ | ✅ | ✅ | Use `staging` or `production` to enable hardened behavior. |
| `DATABASE_URL` | ✅ | - | ✅ | API readiness depends on DB connectivity and `SELECT 1` check. |
| `JWT_SECRET` | ✅ | - | ✅ | 32+ chars, high entropy. |
| `COOKIE_SECRET` | ✅ | - | ✅ | 32+ chars, high entropy. |
| `API_CORS_ORIGINS` | ✅ | - | ✅ | Must include deployed web/admin origins. |
| `NEXT_PUBLIC_SITE_URL` | - | ✅ | ✅ | Web build/start fails fast in hardened envs if missing/invalid. |
| `NEXT_PUBLIC_API_URL` | - | ✅ | ✅ | Used by server/client fetch and web readiness checks. |
| `NEXT_PUBLIC_API_BASE_PATH` | - | ✅ | Recommended | Defaults to `/api/v1`; keep explicit in prod. |
| `NEXT_PUBLIC_CSP_MEDIA_ORIGINS` | - | ✅ | Optional | Comma-separated external media/CDN origins added to `img-src`. |
| `MEDIA_STORAGE_PROVIDER` | ✅ | - | Optional | Only `local` implemented by default blueprint. |

## 8) Staging deployment model and safety

### Environment model

- **live**: production data and uploads; this is your public source of truth.
- **staging**: pre-production clone used by admins/superadmins for release validation.

### Required staging sync environment variables

These variables are required when using staging sync actions (`reset-from-live`, `push-to-live`, `delete`):

- `LIVE_DATABASE_URL`
- `STAGING_DATABASE_URL`
- `LIVE_UPLOADS_PATH`
- `STAGING_UPLOADS_PATH`

Environment mode flags for hardened behavior:

- `NODE_ENV=production`
- `DEPLOY_ENV=staging` (for staging) or `DEPLOY_ENV=production` (for live)

Recommended safety add-ons:

- `STAGING_PUSH_CONFIRMATION_TOKEN` (optional second confirmation for push-to-live)
- `STAGING_SYNC_SCRIPT_PATH` (optional absolute path override for sync helper script)

### How staging operations behave

- **Reset staging from live** copies live DB/uploads to staging and overwrites existing staging content.
- **Push staging to live** copies staging DB/uploads to live and overwrites live production content.
- **Delete staging** drops staging schema/content and removes staging uploads.
- Operations are lock-protected; only one destructive staging action can run at a time.
  - During execution the lock status is `syncing`, `pushing`, or `deleting`.
  - If an operation fails mid-flight, status is marked `stale` and lock returns to `idle`.

### Access model

- **Editor**: cannot access staging endpoints/actions.
- **Admin**: can view staging status.
- **Superadmin**: can run reset, push-to-live, and delete staging actions.

### Safety warnings

- ⚠️ **Push-to-live overwrites live data and uploads.**
- ⚠️ **Reset-from-live overwrites staging data and uploads.**
- ⚠️ **All staging actions should be audit logged and reviewed.**
- ⚠️ **Take verified backups before any push-to-live action.**

### Recommended staging release checklist

- [ ] Verify authentication and role-based access behavior.
- [ ] Verify page editing in admin workflows.
- [ ] Verify draft/revision/publish flow.
- [ ] Verify redirect behavior.
- [ ] Verify media upload/render/delete behavior.
- [ ] Verify revision restore on representative content.
- [ ] Run deployment smoke tests (`pnpm smoke:test`).

## 9) Database requirements

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

## Media storage deployment guidance

- `MEDIA_STORAGE_PROVIDER=local` is the only implemented provider in this blueprint.
- This local mode is production-usable for single-server deployments (homelab, single VM, simple VPS) when the `uploads/` directory is on durable storage and included in backups.
- `s3`, `r2`, and `supabase` providers are extension points only in this blueprint and are intentionally blocked at startup.
- Do not set non-local providers in production unless you implement, test, and operate them end-to-end (upload, delete, URL generation, credentials, bucket/container policies, and failure handling).

Upload scanning uses a pluggable hook (`MediaUploadScanner`). The default is no-op; production environments with malware or compliance requirements should provide a concrete scanner implementation before go-live.

Uploaded media is served by the API at `/uploads` with strong cache semantics: `Cache-Control: public, max-age=2592000, immutable` and ETag validation (`If-None-Match`/`304`).

CDN/reverse-proxy expectations:

- Keep ETag and `Cache-Control` headers intact when proxying `/uploads`.
- Prefer cache key = full path (uploaded filenames are UUID-based and content-address changes use new keys).
- Allow stale-while-revalidate behavior at the edge where supported.
- Ensure `/uploads` is backed by durable storage (bind mount/PVC/network disk) and included in backup/restore procedures.


## Revision pruning operations

Keep revision tables bounded in production by running the prune script on a schedule.

Recommended baseline:

- **Frequency:** daily (minimum weekly for low-volume environments).
- **Retention policy:** keep the latest `100` revisions per page and per content item (`REVISION_RETENTION_COUNT`, defaults to `100`).
- **Command:**

```bash
REVISION_RETENTION_COUNT=100 pnpm revisions:prune
```

Operational note: run this as a cron/CronJob with logs captured; the script outputs JSON counts of deleted rows for observability.

## Scheduling behavior in production

- `publishAt` and `unpublishAt` are enforced at **request time** by the public content API (pages, content items, sitemap).
- There is **no mandatory scheduler worker** for correctness in the default blueprint.
- Operational implication: transitions are applied when traffic requests affected resources; there is no built-in minute-by-minute background mutation process.
- Cache/revalidation implication: the web tier requests public content with `next: { revalidate: 60 }`, so visibility flips can lag by up to roughly one minute after the scheduled timestamp.
- Optional hardening for tighter publish windows:
  - add an explicit scheduler/cron worker,
  - trigger targeted cache invalidation/revalidation hooks,
  - add a lightweight cache-warm step for high-traffic landing pages,
  - or lower TTLs for critical endpoints.

## Production readiness checklist

- [ ] Secrets set with strong random values (`JWT_SECRET`, `COOKIE_SECRET`).
- [ ] `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_PATH` explicitly set.
- [ ] `API_CORS_ORIGINS` explicitly set to deployed origins.
- [ ] Database migrations applied and verified.
- [ ] `/health/live`, `/health/ready`, and `/api/health` checks green.
- [ ] Auth flow tested end-to-end (login, `/me`, logout).
- [ ] Backups and log retention configured.

## First client launch checklist

- [ ] DNS + TLS validated for public/admin/API domains.
- [ ] Cookie domain and secure-cookie behavior verified in browser devtools.
- [ ] CSRF token/header flow verified from UI for mutating admin operations.
- [ ] Rollback plan rehearsed with latest database snapshot.
- [ ] Stakeholder sign-off after smoke tests.


## CSP and external media guidance

The web frontend applies a practical baseline CSP for production readiness:

- default-deny baseline (`default-src 'self'`)
- no plugin/object embedding (`object-src 'none'`)
- no framing (`frame-ancestors 'none'`)
- API + same-origin fetches allowed via `connect-src`
- self-hosted/admin-compatible script + style directives (`'unsafe-inline'` retained intentionally to avoid breaking current Next/admin runtime behavior)
- image loading from `'self'`, `data:`, `blob:`, API origin, and optional allowlisted media origins

If editors or templates embed images from CDN/object-storage domains, set `NEXT_PUBLIC_CSP_MEDIA_ORIGINS` with a comma-separated origin allowlist (for example `https://cdn.example.com,https://images.example.net`).

Avoid wildcard origins in production; prefer explicit host allowlists and tighten script/style directives further once nonce/hash-based CSP is introduced.
