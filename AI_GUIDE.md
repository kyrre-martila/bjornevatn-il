# AI/Developer Extension Guide

This repository is a **content website blueprint**: a reusable monorepo for building client websites with a public site, authenticated admin/editor tools, and a shared API/domain model.

## 1) Project purpose (what to preserve)

- Build content-driven websites from a stable architecture, not one-off pages.
- Keep public, admin, and auth concerns separated by route groups and APIs.
- Treat content as data (pages, blocks, content types/items), not hardcoded JSX strings.

## 2) Surface separation (public/admin/auth)

- `apps/web/app/(public)`: public-facing pages.
- `apps/web/app/(admin)`: admin/editor UI.
- `apps/web/app/(auth)` + auth routes: login/register/callback flows.
- `apps/api`: backend domain/API layer consumed by both public and admin surfaces.

**Rule:** keep cross-surface coupling low. Public pages should read published content; admin should manage content; auth should stay isolated.

## 3) Content architecture (core models)

- **Page + PageBlock model**
  - A `Page` owns ordered `PageBlock[]`.
  - Block `type` drives rendering via the public block registry.
  - Block `data` is structured JSON and must be validated before rendering.
- **ContentType + ContentItem model**
  - `ContentType` defines schema-like `fields`.
  - `ContentItem` stores entries for a type (for lists like news, case studies, etc.).
  - The seeded **Services** example is the reference implementation for hierarchy (`parentId`), taxonomy (`Service Category`), relationships (`relatedServices`), archive rendering (`/services`), and single-item template usage (`/services/[slug]` with `service` template and `index` fallback).

Use these models first before introducing ad-hoc storage patterns.

## 4) Media/storage architecture

- Media metadata lives in domain repositories.
- Binary upload/delete is abstracted behind `MediaStorageProvider` (local/S3/R2/Supabase provider implementations).
- Web UI should consume media URLs/API responses, not touch storage implementation details.

## 5) Styling system expectations

- Use shared CSS variables/design tokens (`packages/ui-tokens` + global token variables).
- Keep styling in existing BEM-style class patterns (`block__element--modifier`).
- Reuse token variables for spacing/color/typography/radius before introducing new values.

## 6) Practical implementation rules

- Do **not** hardcode page content in route files when content belongs in CMS/content APIs.
- Do use content access functions from `apps/web/lib/content.ts` (or extend that layer).
- Do **not** access Prisma directly from the web layer.
- Do **not** bypass domain repository/service boundaries in API modules.
- Prefer extending existing block patterns (schema + renderer + styles) before adding a new block type.

## 7) Adding a new public block (preferred workflow)

1. Confirm an existing block type cannot solve the requirement.
2. Add/extend block type support in domain/content contracts.
3. Add validation + renderer in public block registry.
4. Add BEM-consistent styles using existing tokens.
5. Ensure admin/content APIs can create/edit the block data shape.
6. Keep fallback behavior safe (invalid/unknown blocks should fail soft, not crash pages).

## 8) How AI should extend this blueprint safely

When generating code for new client features:

- Start from existing content and block patterns.
- Keep data-fetching in content/lib layers, not inline in view markup.
- Respect route-group boundaries (`(public)`, `(admin)`, `(auth)`).
- Preserve API → domain service → repository → adapter layering.
- Avoid architecture shortcuts that make fast demos but hard-to-maintain projects.

If unsure, choose the option that is **more reusable, typed, and content-model-driven**.
