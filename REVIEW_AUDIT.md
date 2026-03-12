# Production Readiness Audit — Content Website Blueprint

## Executive summary

**Overall score: 6.1 / 10**

### Top strengths
- Strong monorepo foundation, documented architecture intent, and pragmatic stack choices (NestJS + Next.js + Prisma + Turborepo) aligned with a reusable client-website blueprint.
- Good baseline hardening in API bootstrap: explicit required env checks, strict CORS allowlist behavior, CSRF middleware, helmet, rate limiting, request IDs, and log redaction.
- Solid baseline content primitives in schema: pages + blocks, content types + items, hierarchical content items, taxonomy/terms, SEO fields, and slug redirect tables.
- Public runtime has a central template registry with deterministic fallback behavior, metadata generation hooks, sitemap, robots route, and content-type archive/detail routing.
- Frontend design system direction is better than average for a starter: shared token package, utility layout primitives, and mostly consistent BEM-like naming.

### Top weaknesses
- Public and admin concerns are mixed in the same API controller surface (`/content/*`), with multiple **read endpoints exposed without auth** that return draft/admin-level data.
- Auth/session story is internally inconsistent: architecture/docs and web routes imply refresh-token flow while API module explicitly says refresh is not implemented and lacks endpoint coverage.
- Media pipeline is partially strong (MIME/content checks) but still missing upload-size limits, malware/scanning hooks, and production storage implementations are stubs.
- Admin authoring UX for structured content is too technical for typical editors (ID-based references, comma-separated relation values, schema-level power exposed broadly).
- Performance/scalability patterns are acceptable for small sites but contain obvious N+1/data-overfetch paths and repeated “fetch all then filter” logic that will degrade quickly.

### Readiness verdict
1. **Local testing:** **Yes** (good enough for experimentation and internal demos).
2. **Server deployment:** **Conditional / risky** (possible, but not safe without tightening access boundaries and auth flow consistency).
3. **First real client project:** **Not yet** (requires security and product-shaping work before client-facing production use).

---

## Findings by severity

## Critical

### 1) Public exposure of admin/draft content surfaces
**Why it matters**
- Multiple content endpoints are unauthenticated and return broad datasets (`pages`, `types`, `items`, media list, taxonomies/terms), while write endpoints are role-gated. This mixes public delivery and admin API surface in one controller and leaks non-published/internal editorial structures.
- In production client sites, draft visibility and content model internals are often sensitive and should be private by default.

**Affected files/modules**
- `apps/api/src/modules/content/content.controller.ts`
- `apps/api/src/modules/content/media.controller.ts`

**Recommended fix**
- Split API surfaces explicitly:
  - `/public/*` (strictly published, minimal fields, cache-friendly)
  - `/admin/*` (authenticated, role-gated)
- Enforce auth guards for non-public endpoints by default; opt-in only for curated public reads.
- Add endpoint-level DTOs for public responses to prevent accidental leakage of draft/internal fields.

---

### 2) Auth flow mismatch (refresh implied but not implemented)
**Why it matters**
- The architecture docs describe refresh rotation, web code proxies `/auth/refresh`, and callback logic expects `refreshToken`; however API auth controller implements register/login/logout only, and session docs explicitly state refresh tokens are not implemented.
- This inconsistency is a correctness and operational risk: clients will assume capabilities that do not exist, causing broken auth behavior and difficult incident diagnosis.

**Affected files/modules**
- `docs/ARCHITECTURE.md`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/SESSION_MODEL.md`
- `apps/web/app/api/auth/refresh/route.ts`
- `apps/web/app/auth/callback/route.ts`

**Recommended fix**
- Choose one strategy now:
  1. Implement full refresh token flow end-to-end (API + cookie policy + rotation + revocation + tests), **or**
  2. Remove refresh assumptions from web/docs and standardize on short-lived access + re-auth.
- Add contract tests for auth lifecycle parity (register/login/me/logout/refresh if enabled).

---

## High

### 3) Media upload lacks hard size/processing guardrails
**Why it matters**
- Upload validates type/content and dimensions, but controller uses `FileInterceptor("file")` without explicit limits/filters. This invites memory pressure/DoS via oversized multipart bodies.

**Affected files/modules**
- `apps/api/src/modules/content/media.controller.ts`
- `apps/api/src/modules/content/media.service.ts`

**Recommended fix**
- Configure Multer limits (max file size, file count), reject large payloads early.
- Add explicit timeout + decompression bomb controls for image metadata parsing.
- Add anti-malware scanning integration hook before persistence.

---

### 4) Storage abstraction advertised, but production providers are unimplemented stubs
**Why it matters**
- `S3`, `R2`, `Supabase` providers throw runtime errors. Blueprint positions production readiness, but only local file storage is wired.

**Affected files/modules**
- `apps/api/src/modules/content/storage/s3-storage.provider.ts`
- `apps/api/src/modules/content/storage/r2-storage.provider.ts`
- `apps/api/src/modules/content/storage/supabase-storage.provider.ts`
- `apps/api/src/modules/content/content.module.ts`

**Recommended fix**
- Either implement one production provider fully with tests, or remove stubs from default blueprint scope and document clearly as extension points.
- Add startup validation that blocks selecting unsupported storage providers.

---

### 5) Controller-level over-centralization in content module
**Why it matters**
- `ContentController` is very large and contains validation, access control, business rules, mapping, and route orchestration for pages/content types/items/taxonomies/terms/navigation/settings/media-adjacent checks.
- This harms maintainability, testability, and boundary clarity.

**Affected files/modules**
- `apps/api/src/modules/content/content.controller.ts`

**Recommended fix**
- Split into focused controllers/services (`PagesAdminController`, `PublicContentController`, `TaxonomyAdminController`, etc.).
- Move business rules into dedicated application/domain services to keep controllers thin.

---

### 6) Admin UX is too technical for non-developer editors
**Why it matters**
- Content model editing exposes raw field schema mechanics; relation fields rely on comma-separated IDs; terminology and workflows assume technical users.
- This undermines “safe client editing while developers control design.”

**Affected files/modules**
- `apps/web/app/(admin)/admin/content/ContentAdminClient.tsx`

**Recommended fix**
- Replace raw relation ID entry with searchable pickers/selectors.
- Hide schema editing for non-super-admin roles.
- Add validation UX, previews, and guardrails (warnings for slug/template/SEO impacts).

---

## Medium

### 7) Public runtime is generic but not yet truly “blueprint-generic”
**Why it matters**
- Archive/detail views are generic in routing but still semantically coupled to “news-like” rendering patterns and summary/body assumptions.
- Template resolution is good, but content presentation abstraction is shallow for diverse client site types.

**Affected files/modules**
- `apps/web/app/(public)/[contentTypeSlug]/page.tsx`
- `apps/web/app/(public)/[contentTypeSlug]/[slug]/page.tsx`
- `apps/web/lib/content.ts`
- `apps/web/app/(public)/templates/template-registry.ts`

**Recommended fix**
- Introduce per-content-type display config/contracts (archive card fields, detail sections, date semantics).
- Keep template registry, but decouple generic routes from hardcoded assumptions.

---

### 8) N+1 and overfetch patterns in media/content utilities
**Why it matters**
- `getUsedMediaUrls()` loads all pages, then all content types, then loads items per type (N+1). Multiple frontend helpers fetch broad collections and filter client-side.
- This is acceptable for tiny datasets, but client projects can outgrow it quickly.

**Affected files/modules**
- `apps/api/src/modules/content/media.controller.ts`
- `apps/web/lib/content.ts`

**Recommended fix**
- Add repository-level targeted queries (`findMediaUsage`, selective projections, pagination).
- Add public endpoints returning already-filtered/published data at source.

---

### 9) SEO handling is decent baseline but lacks richer production controls
**Why it matters**
- Title/description/canonical/noindex basics are present, but no robust structured data framework, hreflang strategy, preview image policies, or editorial SEO validation.

**Affected files/modules**
- `apps/web/app/(public)/page/[slug]/page.tsx`
- `apps/web/app/(public)/[contentTypeSlug]/[slug]/page.tsx`
- `apps/web/app/sitemap.ts`
- `apps/web/app/robots.txt/route.ts`

**Recommended fix**
- Add schema.org JSON-LD builders per template/content type.
- Add admin-side SEO linting (title length, description quality, canonical checks).
- Support alternate locales if blueprint targets multilingual sites.

---

### 10) Frontend CSS is maintainable baseline but lacks container-query-first systemization
**Why it matters**
- Tokens and class naming are good, but responsiveness mainly uses viewport media queries; no explicit container-query strategy, few component-scoped boundaries.

**Affected files/modules**
- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`

**Recommended fix**
- Introduce container query tokens/utilities and progressively move key components to container-based layouts.
- Keep token foundation + BEM naming as-is.

---

### 11) Docs are strong, but production claims and implementation parity need tightening
**Why it matters**
- Repository docs are broad and helpful; however key auth/storage realities diverge from docs and implied capabilities.

**Affected files/modules**
- `README.md`
- `docs/ARCHITECTURE.md`
- `apps/api/src/modules/auth/SESSION_MODEL.md`
- `INSTALL.md`

**Recommended fix**
- Add an explicit “implemented vs planned” matrix for blueprint capabilities.
- Ensure auth/storage/runtime docs map 1:1 to shipped behavior.

---

## Low

### 12) Good security baseline includes one dev-time behavior worth narrowing
**Why it matters**
- Web middleware writes a fallback CSRF token in non-production (`test-csrf-token`), useful for DX/CI but broad in scope.

**Affected files/modules**
- `apps/web/middleware.ts`

**Recommended fix**
- Limit fallback CSRF cookie injection strictly to CI/test contexts, not all non-prod runs.

---

## Top 10 improvements to make next (practical priority)

1. **Split public vs admin API surfaces and lock down unauthenticated reads.**
2. **Resolve auth lifecycle inconsistency (implement refresh fully or remove it everywhere).**
3. **Add upload hard limits and processing safeguards for media.**
4. **Refactor oversized content controller into focused modules/services.**
5. **Ship one production-grade media storage provider end-to-end (or remove stubs).**
6. **Upgrade editor UX: replace ID/comma inputs with safe selectors and previews.**
7. **Add query-level optimizations to remove N+1/media usage overfetch.**
8. **Introduce explicit public response DTOs with field whitelisting and pagination.**
9. **Expand SEO system with structured data builders + editor lint checks.**
10. **Publish a capability parity matrix (implemented vs roadmap) in README/docs.**

---

## What not to change

- **Keep the monorepo + package segmentation strategy** (apps + domain + adapters + contracts + tokens); it is a solid base for long-term maintainability.
- **Keep startup hardening and observability direction** (required env validation, CORS strictness, helmet/rate limiting, request IDs, pino redaction, metrics hooks).
- **Keep the content schema core primitives** (Page/PageBlock, ContentType/ContentItem, taxonomy, redirects, SEO fields) — these are the right building blocks.
- **Keep central template registry and deterministic fallback behavior** — this is an excellent blueprint convention.
- **Keep token-driven CSS foundation and naming discipline** — it provides a maintainable frontend baseline.

---

## Bottom line

This blueprint is promising and above-average as an internal foundation, but it is **not yet production-safe for real client delivery** without tightening API boundary/security posture and reconciling auth/storage capability gaps. The fastest path to production credibility is to prioritize **surface separation, auth consistency, and media hardening** before adding more feature breadth.
