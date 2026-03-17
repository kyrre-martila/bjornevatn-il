# Bjørnevatn IL Website – powered by Content Blueprint architecture

A modern website for Bjørnevatn IL built on the Content Blueprint architecture.

## Project purpose

This repository contains the official website project for Bjørnevatn IL. It is based on the proven Content Blueprint architecture and is being adapted from a generic starter into a club-specific digital platform.

Planned website capabilities include:

- Club information pages
- Team pages
- Sponsor system
- Ticket sales
- Clubhouse booking
- News
- Weather widget
- Grasrotandelen integration

These features are planned and described here for project direction; they are not fully implemented yet.

## Tech stack

- **Monorepo tooling:** Turborepo + pnpm workspaces
- **Web app:** Next.js (App Router) + TypeScript
- **API:** NestJS + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Contracts/SDK:** OpenAPI + generated TypeScript SDK
- **Infrastructure:** Docker Compose + Kubernetes Helm chart scaffolding

## Repository structure

- `apps/web` – Next.js frontend for public website and admin UI
- `apps/api` – NestJS API for content, auth, and integrations
- `packages/*` – shared domain logic, DB package, contracts, tokens, SDKs
- `docs/` – architecture, operations, deployment, security, and runbooks
- `infra/` – local/prod observability and deployment-oriented compose files
- `scripts/` – utilities for seed, smoke checks, and maintenance tasks

## Development setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start development services:

   ```bash
   pnpm dev
   ```

3. Open the web app (default):

   - `http://localhost:3000`

## Deployment overview

The project includes deployment scaffolding for containerized environments:

- Docker Compose definitions for local and production-like setups
- CI workflows for build and validation
- Helm chart base for Kubernetes deployments
- Operational and security guidance in `docs/`

As the Bjørnevatn IL Website evolves, environment configuration, secrets, and deployment topology should be finalized per target hosting platform.
