# Content Website Blueprint

An opinionated monorepo blueprint for content-driven websites. It combines a NestJS API, Next.js frontend, Prisma ORM, and Turborepo tooling to help teams ship public websites with structured content, editor workflows, and production-ready operations.

## Who is this for?

Developers and product teams who want a ready-made foundation for public websites with CMS-style authoring workflows. This blueprint is designed for marketing sites, editorial websites, and content platforms that need admin/auth, APIs, reusable content blocks, and a consistent deployment + operations setup.

## Status

This repository is a blueprint, not a finished product. The architecture and defaults are production-inspired, but each implementation should adapt content models, security settings, and deployment configuration to fit its own editorial and publishing requirements.

## Quick start

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Set up environment variables first (see [docs/OPERATIONS.md](docs/OPERATIONS.md#local-development)).

## Overview

- Stack: NestJS API, Next.js web, Prisma ORM, Turborepo monorepo.
- Product shape: public website frontend + admin/editor area backed by authenticated APIs.
- Content model: pages/page blocks plus reusable ContentType and ContentItem collections stored in PostgreSQL.
- Template model: public templates are complete page components (header/main/footer as needed) resolved by a central registry for Pages and ContentTypes.
- Reference example: seeded `Services` ContentType demonstrates hierarchy, taxonomy, relationship fields, archive page (`/services`), and content-type template resolution with fallback to `IndexTemplate`.
- Contracts: OpenAPI under `packages/contracts`.
- Infra: Docker Compose for local + prod simulation, GitHub Actions CI/CD.

## Common commands

- Install dependencies: `pnpm install`
- Apply migrations: `pnpm db:migrate`
- Seed baseline content: `pnpm db:seed`
- Start local development: `pnpm dev`
- Build all apps: `pnpm build`
- Start production API: `pnpm start:api`
- Start production web: `pnpm start:web`

## Quickstart (development)

- Follow [docs/OPERATIONS.md](docs/OPERATIONS.md#local-development) for environment setup, migrations, seed content, and local startup.

## Quickstart (prod simulation)

- Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#prod-simulation) to run the production-like Traefik + services stack locally.

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

Both endpoints accept JSON bodies and respond with `{ user, accessToken }` payloads.

## License

Licensed under the [MIT License](LICENSE). © 2025 Kyrre Arne Martila.
