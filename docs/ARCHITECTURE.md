# Architecture

This blueprint is structured for content-driven websites: a public website experience backed by authenticated admin/editor workflows, shared content APIs, and typed contracts.

## Layering

- Controller (NestJS/Next.js API route) → Domain Service (business logic) → Repository Interface (port) → Prisma Adapter (implements repository) → PostgreSQL database.
- Web clients use generated SDKs; shared DTOs live in `packages/contracts`.
- Public pages and admin/editor tooling both consume the same API/domain boundaries to keep content behavior consistent across surfaces.

## Login / Refresh Sequence

1. Client submits credentials to `/api/v1/auth/login`.
2. Controller validates payload, calls AuthService.
3. AuthService verifies user via UserRepository and issues tokens via TokenService.
4. Tokens stored in secure cookies (web) + refresh record persisted via Prisma.
5. Client uses access token for API requests.
6. On expiration, client calls `/api/v1/auth/refresh` with refresh cookie.
7. AuthService validates rotation, revokes old token, issues new pair.

## ADR References

- [docs/ADRS/0001-auth-model.md](ADRS/0001-auth-model.md)
- [docs/ADRS/0002-storage-choice.md](ADRS/0002-storage-choice.md)

## Reference content pattern: Services

The seeded `services` ContentType is the canonical blueprint example for extending structured content:

- `ContentType`: `Services` (`slug: services`, `templateKey: service`) with instructional field definitions, including a self-referencing `relatedServices` relation field.
- `ContentItem` data: five demo services (`Accounting`, `Payroll`, `Invoicing`, `Annual Reports`, `Advisory`).
- Hierarchy: `Accounting` is a parent with `Payroll` and `Invoicing` as children.
- Taxonomy: `Service Category` taxonomy with `Finance`, `Operations`, and `Advisory` terms assigned to service items.
- Rendering pattern: `/services` archive lists published services; `/services/[slug]` resolves template from ContentType via the central web template registry and falls back to `IndexTemplate` when missing.

Use this pattern when adding additional collections like case studies, team profiles, or portfolios.


## Public template model

- A template is a complete page component (it may include header, main content, and footer).
- The web app keeps a central template registry in `apps/web/app/(public)/templates/template-registry.ts`.
- Public rendering resolves templates by `templateKey` for:
  - `Page` records (`resolvePageTemplate`)
  - `ContentType` records (`resolveContentTypeTemplate`)
- Missing or unknown template keys always fall back to `IndexTemplate`.
