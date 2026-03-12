# Technical Review: Routing Correctness and Safety (Next.js + NestJS + Prisma + TypeScript)

## Scope reviewed
- Routing behavior in `apps/web/app/(public)` and `apps/web/lib/content.ts`.
- Template resolution in `apps/web/app/(public)/templates/template-registry.ts`.
- Public/admin NestJS controllers in `apps/api/src/modules/content` and auth enforcement helpers.
- Type/domain boundaries in `packages/domain`, `packages/domain-adapters-prisma`, and contracts shape.
- Performance and security implications tied to the above.

---

## 1. Critical issues

### 1.1 Public content-type visibility is effectively always-on
**Impact:** Content types intended to be non-public cannot be hidden through the current API contract.

- Public API `GET /content/types` returns only `{ slug, name, templateKey, isPublic: true }` for all types, with no persisted visibility field in schema/domain. `apps/api/src/modules/content/public-content.controller.ts`
- Frontend mapper tries to infer visibility from optional `public`/`isPublic`/`visibility`, but because those fields are absent, every returned type resolves to public. `apps/web/lib/content.ts`
- Prisma `ContentType` model has no `isPublic`/`visibility` field, so this behavior is structurally baked in. `packages/db/prisma/schema.prisma`

**Why critical:** This can expose archives and detail routes for content models that teams may assume are internal.

---

### 1.2 Public item endpoints expose entire arbitrary `data` payloads
**Impact:** Draft-like internal structures or sensitive fields inside `data` can be unintentionally exposed.

- Public item responses include `data: Record<string, unknown>` with no field allowlist/minimization. `apps/api/src/modules/content/public-content.controller.ts`
- Web runtime consumes this broadly (e.g., summary/body extraction) and treats structure as trusted presentation payload. `apps/web/lib/content.ts`

**Why critical:** Public DTO shape is too permissive; accidental sensitive fields in CMS data become internet-visible.

---

## 2. High priority improvements

### 2.1 Page precedence and cross-model slug collision protection are both present
- For single-segment routes (`/:contentTypeSlug`), page lookup runs first, then content-type archive fallback, so page precedence is implemented as requested. `apps/web/app/(public)/[contentTypeSlug]/page.tsx`
- Admin create/update flows explicitly reject cross-entity slug conflicts (`Page.slug` vs `ContentType.slug`). `apps/api/src/modules/content/content.controller.ts`
- Improvement opportunity: add clearer editor UX messaging around why collisions are blocked.

### 2.2 Legacy `/page/:slug` route can create duplicate URL surfaces
- Canonical page path logic prefers `/:slug` (or `/` for home). `apps/web/lib/content.ts`
- `/page/[slug]` still serves content and only redirects when canonical differs, while single-segment route also renders pages. `apps/web/app/(public)/page/[slug]/page.tsx`, `apps/web/app/(public)/[contentTypeSlug]/page.tsx`
- This is mostly handled, but dual route forms increase complexity and risk of inconsistent linking from templates/components.

### 2.3 Routing assumptions still include `news`/`services` hardcoding
- Helpers and homepage defaults are explicitly tied to `news` and `services` paths. `apps/web/lib/content.ts`
- Generic archive/detail routes are in place, but product behavior is still partially type-specific.
- Recommendation: move to configuration-driven defaults (e.g., featured content type) rather than fixed slugs.

### 2.4 Redirect safety is good in web runtime; tighten contract consistency in API
- Web route handlers sanitize internal redirect targets before `permanentRedirect`, which is a strong defense. `apps/web/lib/content.ts`, `apps/web/app/(public)/[contentTypeSlug]/page.tsx`, `apps/web/app/(public)/[contentTypeSlug]/[slug]/page.tsx`, `apps/web/app/(public)/page/[slug]/page.tsx`
- API redirect payload includes `permanent`, but web ignores that flag and always performs permanent redirects.
- Recommendation: either honor redirect type or remove unused field to avoid semantic drift.

### 2.5 API public/private boundary should be stricter by default
- Admin content routes consistently require roles using `requireMinimumRole`, which is good. `apps/api/src/modules/content/content.controller.ts`, `apps/api/src/common/auth/admin-access.ts`
- Public controller still exposes broad structures (`navigation-items`, complete page blocks/data payloads, all content types).
- Recommendation: introduce dedicated public DTOs per route with explicit field-level allowlists and pagination where needed.

---

## 3. Medium improvements

### 3.1 Repeated “fetch all then filter/find” in web routing/data utilities
- `getPublicContentTypeBySlug` fetches all types and then performs in-memory find. `apps/web/lib/content.ts`
- Repeated calls across metadata/page rendering can duplicate upstream requests for the same route.
- Recommendation: add slug-specific content-type endpoint and request-level memoization.

### 3.2 Sitemap generation can become expensive with many content types
- Sitemap content item generation loops all types then fetches each type’s items (`N+1` pattern). `apps/web/lib/content.ts`, `apps/web/app/sitemap.ts`
- Recommendation: API endpoint returning all published sitemap entries in one query.

### 3.3 Media usage detection is N+1
- `getUsedMediaUrls()` iterates content types and fetches items per type. `apps/api/src/modules/content/media.controller.ts`
- Recommendation: repository query that resolves media usage in a single pass.

### 3.4 Domain boundary is mostly clean, with minor type-casting hotspots
- Domain contracts are well-separated from Prisma adapter interfaces. `packages/domain/src`, `packages/domain-adapters-prisma/src`
- Some JSON casting (`as InputJsonValue`) is unavoidable with Prisma JSON but should remain isolated in adapter layer (current state is acceptable).

---

## 4. Minor suggestions

1. Add explicit route test matrix for precedence and collisions:
   - Pages: `/about`, `/contact`
   - Archives: `/news`, `/services`, `/products`
   - Detail: `/news/my-article`, `/services/web-design`
   - Collision: page slug equals content-type slug -> page wins.

2. Add editor-facing warnings when changing slugs that create route ambiguity.

3. Make template key contract shared with API DTO validation (instead of silent fallback only).

4. Consider pagination defaults for public archive endpoints for large datasets.

---

## 5. Things already well implemented

1. **Correct route precedence rule implementation (Page before ContentType archive)** in `/:contentTypeSlug`. `apps/web/app/(public)/[contentTypeSlug]/page.tsx`

2. **Slug redirect support with sanitization** in public runtime, reducing open redirect risk. `apps/web/lib/content.ts`, `apps/web/app/(public)/page/[slug]/page.tsx`

3. **Deterministic template fallback** (`index`) for unknown template keys, improving runtime resilience. `apps/web/app/(public)/templates/template-registry.ts`

4. **Strong API baseline hardening**: global validation pipe, CSRF middleware, CORS allowlist, helmet, and rate limiting. `apps/api/src/main.ts`

5. **Admin route authorization checks are consistently enforced** through role helper usage. `apps/api/src/modules/content/content.controller.ts`, `apps/api/src/common/auth/admin-access.ts`

---

## Routing behavior verification against requested cases

- `/about`, `/contact`: Resolved as pages via single-segment route when published page exists (page-first lookup). `apps/web/app/(public)/[contentTypeSlug]/page.tsx`
- `/news`, `/services`, `/products`: Resolve as content-type archives if no page with same slug exists. `apps/web/app/(public)/[contentTypeSlug]/page.tsx`
- `/news/my-article`, `/services/web-design`: Resolve through generic content-item detail route by `{contentTypeSlug, slug}`. `apps/web/app/(public)/[contentTypeSlug]/[slug]/page.tsx`, `apps/web/lib/content.ts`
- Page precedence over ContentType routes: Implemented correctly in runtime.
