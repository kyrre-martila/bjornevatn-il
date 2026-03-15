# Operations

## Local Development

1. Copy `env.example` → `.env` and set required secrets.
2. Start base services: `docker compose -f infra/docker-compose.yml up -d`.
3. Install deps: `pnpm install`.
4. Generate Prisma client (optional): `pnpm db:generate`.
5. Prepare DB schema + baseline content: `pnpm db:setup`.
6. Start services: `pnpm dev` (web/api).

If needed, run DB commands separately:

- `pnpm db:migrate`
- `pnpm db:seed`

## CI/CD Hooks

- `pnpm db:migrate` runs in CI before API/web tests for the website blueprint.
- Seed script runs only in dev and dedicated CI jobs tagged `Seed`.

## Database Rollback

1. Capture backup: `pg_dump $DATABASE_URL > backup.sql` (or restore latest managed backup).
2. Run `pnpm db:resolve:rolled-back "<migration_id>"` to mark migration as rolled back.
3. Deploy rollback artifact via pipeline.
4. Verify schema via `pnpm db:status` before reopening traffic.

## Secret Rotation

1. Generate new values for all secrets stored in platform secret manager.
2. Update `.env` (local) or secrets store (CI/CD, runtime).
3. Redeploy API/web containers to pick up new values.
4. Validate by signing in and confirming cookies/tokens reissued.
5. Record rotation in [docs/RUNBOOKS/rotate-secrets.md](RUNBOOKS/rotate-secrets.md).

## Production Incident First Aid

1. Check Prometheus `/metrics` via Traefik secure endpoint.
2. Inspect centralized logs (Pino JSON) for spikes in error level.
3. Review traces in OTLP backend for failing spans.
4. Test database connectivity: `psql $DATABASE_URL -c "select 1"`.
5. If degraded, follow [docs/RUNBOOKS/incident-response.md](RUNBOOKS/incident-response.md).

## Revision Pruning

Revision history is append-only and can grow quickly on active sites. Run the pruning job on a regular cadence to control table size and backup/restore time.

Recommended baseline:

- **Frequency:** daily (or at least weekly for low-change sites).
- **Retention policy:** keep the most recent `100` revisions per page/content item (default).
- **Execution command:**

```bash
REVISION_RETENTION_COUNT=100 pnpm revisions:prune
```

The script prints a JSON summary with the number of deleted page/content-item revisions. Consider wiring this command into a platform cron job (Kubernetes CronJob, GitHub Actions schedule, or host scheduler).

## Request-time Scheduling Behavior

Scheduled visibility is enforced at request time:

- `publishAt` / `unpublishAt` are checked by public content read paths (including sitemap generation).
- There is **no required scheduler worker** for correctness in the default blueprint.
- State changes become visible when new requests are served, not through a background mutation loop.

Cache implications:

- Web public fetches use time-based revalidation (`revalidate: 60`), so publication flips can appear up to ~60 seconds after the target timestamp.
- If tighter SLAs are required, add one or more of: lower TTLs, explicit revalidation triggers, or a scheduler/cache-warm process for critical routes.

## Deployment Smoke Test

Run the post-deploy smoke test from the repo root:

```bash
pnpm smoke:test
```

The script validates these endpoints:

- API health endpoint (`GET /health`)
- login endpoint (`POST /api/v1/auth/login`)
- admin authentication (`GET /api/v1/content/pages` with admin session cookie)
- public content endpoint (`GET /api/v1/public/content/pages`)
- sitemap endpoint (`GET /sitemap.xml`)

Required environment variables:

- `SMOKE_ADMIN_PASSWORD`: password for the admin account used in the check.

Optional environment variables:

- `SMOKE_ADMIN_EMAIL` (default: `admin@example.com`)
- `SMOKE_API_ORIGIN` (default: `http://localhost:4000`)
- `SMOKE_WEB_ORIGIN` (default: `http://localhost:3000`)
- `SMOKE_API_BASE_PATH` (default: `/api/v1`)
- `SMOKE_TIMEOUT_MS` (default: `10000`)

## Staging environment sync operations

The API staging admin endpoints now rely on local PostgreSQL tooling (`pg_dump`, `psql`) and `rsync` through `apps/api/scripts/staging-env-sync.sh`.

Required environment variables:

- `LIVE_DATABASE_URL`
- `STAGING_DATABASE_URL`
- `LIVE_UPLOADS_PATH`
- `STAGING_UPLOADS_PATH`

Optional operational override:

- `STAGING_SYNC_SCRIPT_PATH` (absolute path to the helper script if not using the default project locations).

Optional extra safety for push-to-live:

- `STAGING_PUSH_CONFIRMATION_TOKEN` (if set, callers must provide this token in the API request body).

The push-to-live API path also requires an explicit payload flag: `confirmPushToLive=true`.

Audit log action names emitted by staging admin endpoints:

- `staging_viewed`
- `staging_reset_from_live`
- `staging_push_to_live`
- `staging_deleted`
- `staging_action_failed`
