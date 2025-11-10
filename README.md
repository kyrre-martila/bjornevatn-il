# Fullstack App Blueprint

An opinionated monorepo that combines a NestJS API, Next.js web client, Flutter mobile app, Prisma ORM, and Turborepo tooling for modern product teams.

## Who is this for?

Developers who want a ready-made blueprint for SaaS, analytics dashboards, or similar web applications built with NestJS + Next.js + Prisma + Turborepo. It trades flexibility for conventions so you can start from a production-inspired foundation instead of wiring everything from scratch.

## Status

This repository is a blueprint, not a finished product. The patterns are production-inspired, but every project should review and adapt configuration, security, and deployment choices to match its own requirements.

## Quick start

```bash
pnpm install
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm dev
```

Set up environment variables (see [docs/OPERATIONS.md](docs/OPERATIONS.md#local-development)) before running commands.

## Overview

- Stack: NestJS API, Next.js web, Flutter mobile, Prisma ORM, Turborepo monorepo.
- Contracts: OpenAPI under `packages/contracts`.
- Infra: Docker Compose for local + prod simulation, GitHub Actions CI/CD.

## Quickstart (development)

- Follow [docs/OPERATIONS.md](docs/OPERATIONS.md#local-development) for environment, migrations, seeding, and app startup.

## Quickstart (prod simulation)

- Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#prod-simulation) to run the Traefik + services stack locally.

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

## License

Licensed under the [MIT License](LICENSE). © 2025 Kyrre Martila.
