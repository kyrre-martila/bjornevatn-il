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

## 4) Install dependencies

```bash
pnpm install
```

## 5) Prepare database

```bash
pnpm db:setup
```

(Equivalent explicit commands: `pnpm db:migrate` then `pnpm db:seed`.)

## 6) Develop and deploy

- Dev (api + web): `pnpm dev`
- Build: `pnpm build`
- Production start (api + web): `pnpm start`
- Single service start: `pnpm start:api` or `pnpm start:web`
- Set production env vars from `.env.prod.example`
- Validate health endpoints after release
