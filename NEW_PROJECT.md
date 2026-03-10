# NEW_PROJECT

Recommended workflow when starting a new site from this blueprint.

## 1) Clone the blueprint

```bash
git clone <blueprint-repo-url> my-new-site
cd my-new-site
```

## 2) Rename the project

- Update `name` in root `package.json`.
- Update app/package names and docs references as needed.

## 3) Configure environment

```bash
cp env.example .env
```

Set project-specific values (URLs, secrets, SMTP, DB connection).

## 4) Run migrations

```bash
pnpm prisma migrate deploy
```

## 5) Seed baseline data

```bash
pnpm prisma db seed
```

## 6) Deploy

- Build: `pnpm build`
- Start API + web behind a reverse proxy
- Set production env vars from `.env.prod.example`
- Validate health endpoints after release
