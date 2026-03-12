# INSTALL

Use this guide to run the blueprint locally after cloning.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Docker + Docker Compose (recommended for local PostgreSQL)

## Root workflow (quick reference)

```bash
pnpm install
pnpm db:setup
pnpm dev
```

`pnpm db:setup` runs `pnpm db:migrate` and `pnpm db:seed`.

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

## 4) Apply migrations + seed

```bash
pnpm db:setup
```

Or run explicitly:

```bash
pnpm db:migrate
pnpm db:seed
```

## 5) Run the dev servers

```bash
pnpm dev
```

By default:

- web: `http://localhost:3000`
- API: `http://localhost:4000`
