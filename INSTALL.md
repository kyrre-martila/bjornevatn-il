# INSTALL

Use this guide to run the blueprint locally after cloning.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker + Docker Compose (recommended for local PostgreSQL)

## 1) Install dependencies

```bash
pnpm install
```

## 2) Configure environment

```bash
cp env.example .env
```

Update at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `ENCRYPTION_KEY`

## 3) Start the database

Recommended (local Postgres via Docker):

```bash
docker compose -f infra/docker-compose.yml up -d db
```

Default container DB values are:

- user: `postgres`
- password: `postgres`
- database: `blueprint`
- host/port: `localhost:5432`

Set `DATABASE_URL` in `.env` to match.

## 4) Run migrations

```bash
pnpm prisma migrate deploy
```

## 5) Seed initial data

```bash
pnpm prisma db seed
```

## 6) Run the dev servers

```bash
pnpm dev
```

By default:

- web: `http://localhost:3000`
- API: `http://localhost:4000`
