# Architecture

This blueprint is structured for content-driven websites: a public website experience backed by authenticated admin/editor workflows, shared content APIs, and typed contracts.

## Layering

- Controller (NestJS/Next.js API route) → Domain Service (business logic) → Repository Interface (port) → Prisma Adapter (implements repository) → PostgreSQL database.
- Web clients use generated SDKs; shared DTOs live in `packages/contracts`.
- Public pages and admin/editor tooling both consume the same API/domain boundaries to keep content behavior consistent across surfaces.

## Login / Session Sequence

1. Client submits credentials to `/api/v1/auth/login` (or `/api/v1/auth/register`).
2. Controller validates payload and calls `AuthService`.
3. `AuthService` verifies credentials, issues a JWT access token with a random session id (`sid`), and stores session state in the `Session` table.
4. API sets the JWT in the HttpOnly `access` cookie for browser flows; non-browser clients may send it as `Authorization: Bearer`.
5. Protected endpoints (including `/api/v1/me`) validate both JWT integrity and active server-side `Session` state.
6. `POST /api/v1/auth/logout` revokes the current session row and clears the `access` cookie.
7. There is no refresh-token exchange in the API auth module; when access tokens expire, clients re-authenticate.

**Implemented vs planned:** stateful JWT+Session auth is implemented; refresh-token rotation and external IdP/OAuth flows are planned customization work.

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
- Valid template keys are defined in one runtime contract: `apps/web/lib/templates.ts` (`TEMPLATE_KEYS`, `DEFAULT_TEMPLATE_KEY`, and `coerceTemplateKey`).
- The web app keeps a central template registry in `apps/web/app/(public)/templates/template-registry.ts`.
- Public rendering resolves templates by `templateKey` for:
  - `Page` records (`resolvePageTemplate`)
  - `ContentType` records (`resolveContentTypeTemplate`)
- Resolution is deterministic and generic: all lookups go through `coerceTemplateKey` and then the shared registry.
- Missing or unknown template keys are always fallback-safe and resolve to `IndexTemplate`.
