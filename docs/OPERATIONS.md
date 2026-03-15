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

The script validates these endpoints and role checks:

- API health endpoint (`GET /health`)
- login endpoints for admin/editor/superadmin (`POST /api/v1/auth/login`)
- admin authentication (`GET /api/v1/content/pages` with admin session cookie)
- public content endpoint (`GET /api/v1/public/content/pages`)
- staging status endpoint (`GET /api/v1/admin/staging/status`)
- staging page access with auth cookie (`GET /admin/staging`)
- staging authorization controls:
  - reset-from-live (`POST /api/v1/admin/staging/reset-from-live`)
  - push-to-live (`POST /api/v1/admin/staging/push-to-live`)
  - delete staging (`DELETE /api/v1/admin/staging`)
- sitemap endpoint (`GET /sitemap.xml`)

Required environment variables:

- `SMOKE_ADMIN_PASSWORD`: password for admin account.
- `SMOKE_EDITOR_PASSWORD`: password for editor account.
- `SMOKE_SUPERADMIN_PASSWORD`: password for superadmin account.

Optional environment variables:

- `SMOKE_ADMIN_EMAIL` (default: `admin@example.com`)
- `SMOKE_EDITOR_EMAIL` (default: `editor@example.com`)
- `SMOKE_SUPERADMIN_EMAIL` (default: `superadmin@example.com`)
- `SMOKE_STAGING_PUSH_CONFIRMATION_TOKEN` (set when API requires `STAGING_PUSH_CONFIRMATION_TOKEN`)
- `SMOKE_API_ORIGIN` (default: `http://localhost:4000`)
- `SMOKE_WEB_ORIGIN` (default: `http://localhost:3000`)
- `SMOKE_API_BASE_PATH` (default: `/api/v1`)
- `SMOKE_TIMEOUT_MS` (default: `10000`)

## Staging environment workflow (agency operations)

Use staging as a controlled pre-production clone of live for editorial QA and release checks.

### Environment model

- **live**: production database + uploads used by the public site.
- **staging**: non-public validation environment used before publishing changes to live.

### Required environment variables for staging operations

The API staging admin endpoints rely on local PostgreSQL tooling (`pg_dump`, `psql`) and `rsync` through `apps/api/scripts/staging-env-sync.sh`.

Required:

- `LIVE_DATABASE_URL`
- `STAGING_DATABASE_URL`
- `LIVE_UPLOADS_PATH`
- `STAGING_UPLOADS_PATH`

Environment mode flags (recommended/required for hardened behavior):

- `NODE_ENV=production`
- `DEPLOY_ENV=staging` (staging runtime) / `DEPLOY_ENV=production` (live runtime)

Optional safety/operations:

- `STAGING_PUSH_CONFIRMATION_TOKEN` (if set, callers must provide this token in the API payload)
- `STAGING_SYNC_SCRIPT_PATH` (absolute helper script override if not using default project path)

### How staging actions work

- **Reset staging from live**
  - Copies live database to staging database.
  - Syncs live uploads to staging uploads.
  - Overwrites all staging data/media.
- **Push staging to live**
  - Copies staging database to live database.
  - Syncs staging uploads to live uploads.
  - Overwrites all live data/media.
  - Requires `confirmPushToLive=true` in request payload.
  - If configured, also requires matching `confirmationToken` (`STAGING_PUSH_CONFIRMATION_TOKEN`).
- **Delete staging**
  - Drops/recreates staging schema and removes staging uploads path.

### Lock behavior

- Destructive staging actions acquire a lock (`syncing`, `pushing`, `deleting`).
- While locked, concurrent destructive actions are rejected.
- On success, lock returns to `idle` and state is updated.
- On failure, state is marked `stale` and lock returns to `idle` for operator recovery.

### Access model

- **Editor**: no staging access.
- **Admin**: can view staging status.
- **Superadmin**: can run reset-from-live, push-to-live, and delete staging.

### Safety warnings

- ⚠️ Push-to-live overwrites live data.
- ⚠️ Reset-from-live overwrites staging data.
- ⚠️ Staging actions should always be auditable.
- ⚠️ Backups are strongly recommended before push-to-live.

### Audit events

Audit log action names emitted by staging admin endpoints:

- `staging_viewed`
- `staging_reset_from_live`
- `staging_push_to_live`
- `staging_deleted`
- `staging_action_failed`

### Recommended staging checklist

Before approving push-to-live:

- [ ] Verify auth/login and role gating.
- [ ] Verify page editing flow in admin UI.
- [ ] Verify publish flow (draft/revision/publish).
- [ ] Verify redirect behavior.
- [ ] Verify media upload, render, and replace/delete behavior.
- [ ] Verify revision restore on representative pages/content items.
- [ ] Verify smoke test pass (`pnpm smoke:test`).
