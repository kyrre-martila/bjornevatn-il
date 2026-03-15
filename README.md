# Content Website Blueprint

An opinionated monorepo blueprint for content-driven websites. It combines a NestJS API, Next.js frontend, Prisma ORM, and Turborepo tooling to help teams ship public websites with structured content, editor workflows, and production-ready operations.

## Who is this for?

Developers and product teams who want a ready-made foundation for public websites with CMS-style authoring workflows. This blueprint is designed for marketing sites, editorial websites, and content platforms that need admin/auth, APIs, reusable content blocks, and a consistent deployment + operations setup.

## Status

This repository is a blueprint, not a finished product. The architecture and defaults are production-inspired, but each implementation should adapt content models, security settings, and deployment configuration to fit its own editorial and publishing requirements.

### Implemented vs planned (high level)

- **Implemented now:** local auth with JWT access tokens + server-side `Session` validation, cookie-first web auth, role-aware admin area, Prisma/Postgres content model, migrations + seed workflow, and production-oriented API/web deployment scaffolding.
- **Planned/customize per project:** identity provider integrations (OAuth/SSO), refresh-token/rotation strategy (if needed), richer editorial workflows/approval flows, object-storage provider implementations (S3/R2/Supabase), and tenant-specific session hardening.

### Media storage and upload status

- **Implemented now:** local filesystem media storage (`/uploads`), content-based file type validation, metadata extraction, upload size limits, and a pluggable upload scanner hook (`MediaUploadScanner`) with a safe no-op default.
- **Extension points only (not shipped end-to-end):** S3, R2, and Supabase media providers.
- **Startup safety:** `MEDIA_STORAGE_PROVIDER` defaults to `local`. Any non-local value currently fails startup with a clear error until a real provider implementation is added.
- Deployment hardening: staging/production enforce explicit public web URLs, strict CORS allowlists, and fail-fast startup checks for missing migrations/config.
- **Production guidance:** local storage is production-usable for single-server deployments (homelab/single VM/simple VPS) when `uploads/` is persisted and backed up.
- **Cloud-provider go-live requirements:** before enabling S3/R2/Supabase, implement and validate provider behavior end-to-end (upload/delete/url generation/credentials/policies/operational monitoring).

### Production readiness matrix

| Area                  | Status                    | Notes                                                                                                                                              |
| --------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                  | **implemented**           | Local email/password auth with JWT + server-side session validation, password reset flow, and cookie-first web auth are available now.             |
| RBAC                  | **partially implemented** | Role-aware admin access exists (`editor`/`admin`/`super_admin`), but fine-grained, policy-level permissions are project-specific.                  |
| Pages/content editing | **implemented**           | Admin APIs and web UI support editing pages, blocks, content types, and content items.                                                             |
| Media storage         | **partially implemented** | Local filesystem provider is production-usable for single-server setups; cloud object storage providers are extension points.                      |
| Revisions             | **implemented**           | Page/content revision history and restore flows are included in the content domain, with cursor pagination and a keep-latest-100 retention policy. |
| Scheduled publishing  | **planned**               | No background scheduler is enabled by default; `publishAt`/`unpublishAt` are enforced at request time by public page/content/sitemap endpoints.    |
| Approval workflow     | **planned**               | Multi-step editorial approval flows are intentionally left for project customization.                                                              |
| Audit log             | **partially implemented** | Audit logging infrastructure exists, but full editorial-event coverage should be extended per project requirements.                                |
| Redirects             | **implemented**           | Legacy slug redirects are supported in public content resolution.                                                                                  |
| Deployment            | **implemented**           | Docker + CI/CD-oriented deployment scaffolding and production checks are included.                                                                 |
| Staging               | **partially implemented** | Environment-aware hardening exists; teams still need to provision and operate their own staging environment/process.                               |


### Operational probes and runtime reality

- API liveness: `GET /health/live`
- API readiness: `GET /health/ready` (or `GET /health`)
- Web liveness: `GET /api/health`
- Web readiness (staging/prod recommended): `GET /api/health?ready=1`

Readiness is dependency-aware: API readiness verifies DB query execution and returns `503` on failure; web readiness verifies API reachability and also returns `503` when the API is unavailable.

### Before first client launch

- [ ] Keep public registration disabled unless explicitly required (`REGISTRATION_ENABLED=false` and matching web toggle).
- [ ] Configure and validate the mailer for password-reset and operational emails.
- [ ] Verify database and upload-storage backups (and restore procedure).
- [ ] Verify `/health/live`, `/health/ready`, `/api/health`, and `/api/health?ready=1` in the target environment.
- [ ] Test end-to-end auth flows (login, logout, forgot password, reset password).
- [ ] Test redirect handling for changed/legacy slugs.
- [ ] Test the real publish workflow your editors will use (draft/revision/publish expectations).
- [ ] Confirm media storage mode (local persisted volume vs custom object storage provider).
- [ ] Confirm editorial expectations for scheduling: transitions are request-time evaluated (not cron-driven) and may lag by cache TTL.
- [ ] Confirm admin/editor role assignments and least-privilege access before handoff.

## One root-level workflow

```bash
pnpm install
pnpm db:setup
pnpm dev
```

Then for release builds:

```bash
pnpm build
pnpm start
```

Set up environment variables first (see [docs/OPERATIONS.md](docs/OPERATIONS.md#local-development)).

## Common root commands

- `pnpm install` — install dependencies.
- `pnpm db:migrate` — apply committed Prisma migrations.
- `pnpm db:seed` — seed baseline content/users.
- `pnpm db:setup` — run migration + seed in one command.
- `pnpm dev` — run API + web in development mode.
- `pnpm build` — build all workspace apps/packages.
- `pnpm start` — start API + web from production builds.
- `pnpm revisions:prune` — prune stale page/content revisions beyond the keep-latest retention threshold (default: 100).
- `pnpm start:api` / `pnpm start:web` — start only one service.

## Overview

- Stack: NestJS API, Next.js web, Prisma ORM, Turborepo monorepo.
- Product shape: public website frontend + admin/editor area backed by authenticated APIs.
- Content model: pages/page blocks plus reusable ContentType and ContentItem collections stored in PostgreSQL.
- Template model: public templates are complete page components (header/main/footer as needed) resolved by a central registry for Pages and ContentTypes.
- Reference example: seeded `Services` ContentType demonstrates hierarchy, taxonomy, relationship fields, archive page (`/services`), and content-type template resolution with fallback to `IndexTemplate`.
- Contracts: OpenAPI under `packages/contracts`.
- Infra: Docker Compose for local + prod simulation, GitHub Actions CI/CD.

## Quickstart references

- Local/dev workflow: [INSTALL.md](INSTALL.md)
- Production deployment workflow: [DEPLOY.md](DEPLOY.md)
- New project bootstrap checklist: [NEW_PROJECT.md](NEW_PROJECT.md)
- Extended operational docs: [docs/OPERATIONS.md](docs/OPERATIONS.md)

## Operational References

- [docs/SECURITY.md](docs/SECURITY.md)
- [docs/OPERATIONS.md](docs/OPERATIONS.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md)
- [docs/TESTING.md](docs/TESTING.md)
- [docs/API_VERSIONING.md](docs/API_VERSIONING.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/RUNBOOKS](docs/RUNBOOKS)
- [docs/ADRS](docs/ADRS)

## Auth environment

- `JWT_SECRET`: Secret key used to sign authentication tokens. **Required**.
- `JWT_EXPIRES_IN`: Lifetime for issued access tokens (for example `1h`, `2d`).
- `REGISTRATION_ENABLED`: Enables public API registration when set to `true`. Defaults to disabled (`false`) for invite/admin-created account workflows.
- `NEXT_PUBLIC_REGISTRATION_ENABLED`: Web toggle for showing the self-registration UI (should match `REGISTRATION_ENABLED`).
- `ALLOW_PUBLIC_REGISTRATION_IN_HARDENED_ENV`: Extra safety flag for `production`/`staging`; must also be `true` before `/auth/register` accepts self-signups in hardened environments.
- `APP_URL`: Public web origin used to build password-reset links (for example `http://localhost:3000`).

## Auth endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/me`

Auth behavior in this blueprint today:

- `register` and `login` accept JSON credentials, create a server-side session row, set an HttpOnly `access` cookie, and return `{ user }`.
- Public self-registration is disabled by default. Set `REGISTRATION_ENABLED=true` and `NEXT_PUBLIC_REGISTRATION_ENABLED=true` only when you explicitly want open signups.
- In `production`/`staging`, `/auth/register` is additionally blocked unless `ALLOW_PUBLIC_REGISTRATION_IN_HARDENED_ENV=true` is explicitly set (defense-in-depth for production handoff).
- For agency/client projects, keep registration disabled and provision users via admin tooling or invitation flows.
- `/me` reads the access token from cookie or `Authorization: Bearer` header, validates JWT + active `Session`, and returns the authenticated profile.
- `logout` revokes the active `Session` and clears the `access` cookie.
- `forgot-password` always returns success to avoid user enumeration; if the email exists, a `MagicLink` reset token is generated and sent by mail.
- `reset-password` validates an unused, unexpired `MagicLink` token, updates the user password, and marks the token as used.
- Web pages are available at `/auth/forgot-password` and `/auth/reset-password?token=...`.
- Refresh-token rotation is **not implemented**. The web `/api/auth/refresh` route returns `410 Gone` by design, so clients must re-authenticate when access tokens expire.

## License

Licensed under the [MIT License](LICENSE). © 2025 Kyrre Arne Martila.


## Production environment matrix (quick reference)

| Variable | API | Web | Required in staging/production |
| --- | --- | --- | --- |
| `NODE_ENV`, `DEPLOY_ENV` | ✅ | ✅ | ✅ |
| `DATABASE_URL` | ✅ | - | ✅ |
| `JWT_SECRET`, `COOKIE_SECRET` | ✅ | - | ✅ |
| `API_CORS_ORIGINS` | ✅ | - | ✅ |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` | - | ✅ | ✅ |
| `NEXT_PUBLIC_API_BASE_PATH` | - | ✅ | Recommended |
| `NEXT_PUBLIC_CSP_MEDIA_ORIGINS` | - | ✅ | Optional (if external media is used) |
| `MEDIA_STORAGE_PROVIDER` | ✅ | - | Optional (`local` only by default blueprint) |

Run 3 / 3.5 operational notes: treat scheduling and media as explicit handoff items. Scheduled publish/unpublish is request-time evaluated (not cron-driven), and local media storage is operationally viable only when `uploads/` persistence + backups + CDN/proxy behavior are validated before launch.
