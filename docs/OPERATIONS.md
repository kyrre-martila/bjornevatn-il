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
