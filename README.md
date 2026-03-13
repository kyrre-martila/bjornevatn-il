# Content Website Blueprint

An opinionated monorepo blueprint for content-driven websites. It combines a NestJS API, Next.js frontend, Prisma ORM, and Turborepo tooling to help teams ship public websites with structured content, editor workflows, and production-ready operations.

## Who is this for?

Developers and product teams who want a ready-made foundation for public websites with CMS-style authoring workflows. This blueprint is designed for marketing sites, editorial websites, and content platforms that need admin/auth, APIs, reusable content blocks, and a consistent deployment + operations setup.

## Status

This repository is a blueprint, not a finished product. The architecture and defaults are production-inspired, but each implementation should adapt content models, security settings, and deployment configuration to fit its own editorial and publishing requirements.

### Implemented vs planned (high level)

- **Implemented now:** local auth with JWT access tokens + server-side `Session` validation, cookie-first web auth, role-aware admin area, Prisma/Postgres content model, migrations + seed workflow, and production-oriented API/web deployment scaffolding.
- **Planned/customize per project:** identity provider integrations (OAuth/SSO), refresh-token/rotation strategy (if needed), richer editorial workflows/approval flows, object-storage provider implementations (S3/R2/Supabase), and tenant-specific session hardening.

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

## Auth endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`

Auth behavior in this blueprint today:

- `register` and `login` accept JSON credentials, create a server-side session row, set an HttpOnly `access` cookie, and return `{ user }`.
- `/me` reads the access token from cookie or `Authorization: Bearer` header, validates JWT + active `Session`, and returns the authenticated profile.
- `logout` revokes the active `Session` and clears the `access` cookie.
- Refresh-token rotation is **not implemented**. The web `/api/auth/refresh` route returns `410 Gone` by design, so clients must re-authenticate when access tokens expire.

## License

Licensed under the [MIT License](LICENSE). © 2025 Kyrre Arne Martila.
