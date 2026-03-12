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

## 4) Run the root workflow

Use the root-level scripts so setup is consistent with the rest of the docs:

```bash
pnpm install
pnpm db:setup
# or run explicitly:
# pnpm db:migrate
# pnpm db:seed
pnpm dev
pnpm build
```

## 5) Production start options

- Start both services: `pnpm start`
- Start one service: `pnpm start:api` or `pnpm start:web`
- Set production env vars from `.env.prod.example`
- Validate health endpoints after release
