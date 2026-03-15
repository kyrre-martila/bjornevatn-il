# Architecture Guide for AI

## Repository structure
```txt
apps/
  api/
  web/

packages/
  contracts/
  shared/

docs/
ai/
```

## Where things live
- **API modules**: `/apps/api/modules`
- **Frontend pages (App Router)**: `/apps/web/app`
- **Frontend components**: `/apps/web/components`
- **Content schemas / content module logic**: `/apps/api/modules/content`
- **Environment config**: infra + runtime env files (`/infra`, deployment config, and app environment variables)

## Ownership boundaries
- Keep CMS platform behavior stable unless a task explicitly requires platform changes.
- Implement client/site-specific features in `apps/web` and targeted API modules only.
- Treat `packages/contracts` as the source of API contract truth when endpoints or payloads change.
