# Deployment

## Prod Simulation

1. Copy `.env.prod.example` → `.env.prod` and set secrets.
2. Run stack: `docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d`.
3. Wait for Traefik admin UI at `https://traefik.localhost` (self-signed TLS).
4. Verify API readiness at `https://api.localhost/health/ready`, API liveness at `https://api.localhost/health/live`, and web health at `https://app.localhost/api/health` plus web readiness at `https://app.localhost/api/health?ready=1`.

## Environment Variables

- Reference `.env.prod.example` for the minimal set.
- Load into platform secret manager before CI/CD deploys.
- Keep dev/test secrets separate from prod-simulation.

## Networking

- Traefik terminates TLS (self-signed certificates). Override certs by mounting files under `infra/certs`.
- Default ports: 443 (HTTPS), 80 (HTTP redirect), MailHog 8025, Postgres 5432.
- Healthchecks defined in `infra/docker-compose.prod.yml` for API readiness (`/health/ready`) and web readiness (`/api/health?ready=1`).
- API production container starts Nest from `dist/src/main.js` (matching `apps/api` TypeScript build output).

## Registry Push

- CI workflow `Docker Publish` builds images and pushes to the configured registry (`REGISTRY_HOST/PROJECT/*`).
- Local manual push: `docker compose -f infra/docker-compose.prod.yml build` → `docker push <tag>`.
- Tag images with commit SHA for traceability.

## Media storage provider status

- Implemented provider: `local` (`MEDIA_STORAGE_PROVIDER=local`, default).
- Extension points only: `s3`, `r2`, `supabase`.
- Startup guardrail: API startup fails fast if `MEDIA_STORAGE_PROVIDER` is set to an unsupported provider.

`local` storage is production-usable for single-server deployments when `uploads/` is durable and backed up. Before using a cloud provider in production, implement and validate the provider end-to-end (write/delete/read URL behavior, credentials handling, bucket/container policy, and operational monitoring).

Upload scanning is exposed as a pluggable `MediaUploadScanner` hook. The default scanner is no-op; replace it when your threat model/compliance posture requires scanning.


## Readiness and ordering

1. Ensure database is reachable.
2. Apply migrations before release (`pnpm db:migrate`).
3. Start API and verify `GET /health/live` and `GET /health/ready`.
4. Start web and verify `GET /api/health` and `GET /api/health?ready=1`.
5. Run an auth smoke test (login, `/api/v1/me`, logout).

Staging should set `DEPLOY_ENV=staging` so startup/runtime guardrails match production expectations.
