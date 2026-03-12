# NEW_PROJECT

Recommended workflow when starting a new site from this blueprint.

---

## 1) Clone the blueprint

```bash
git clone <blueprint-repo-url> my-new-site
cd my-new-site
```

---

## 2) Rename the project

Update project identifiers where appropriate:

- Update `name` in root `package.json`
- Update app/package names if needed
- Update any docs references

---

## 3) Configure environment

Copy the environment template:

```bash
cp env.example .env
```

Set project-specific values such as:

- `DATABASE_URL`
- `APP_URL`
- `API_URL`
- authentication secrets
- SMTP settings
- storage configuration

---

## 4) Install dependencies

```bash
pnpm install
```

---

## 5) Setup the database

Run the standard database setup script:

```bash
pnpm db:setup
```

This runs migrations and seeds the database.

If you want to run them separately:

```bash
pnpm db:migrate
pnpm db:seed
```

---

## 6) Start development

```bash
pnpm dev
```

This runs both the API and the web app.

---

## 7) Build for production

```bash
pnpm build
```

---

## 8) Production start options

Start both services:

```bash
pnpm start
```

Start services individually:

```bash
pnpm start:api
pnpm start:web
```

For production deployments:

- Use environment variables from `.env.prod.example`
- Ensure database migrations have been applied
- Validate `/health` endpoints after deployment

---

## Common root commands

- `pnpm install`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm db:setup`
- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm start:api`
- `pnpm start:web`
