# Technical Review: Routing Correctness and Safety (Next.js + NestJS + Prisma)

## 1) Critical issues

1. **Canonical URL + sitemap for pages do not match the effective public route precedence.**
   - Runtime precedence intentionally resolves `/:contentTypeSlug` as a Page first (`resolvePageContentBySlug(contentTypeSlug)`), meaning `/about` and `/contact` can resolve directly as pages.
   - But metadata and sitemap for pages still default to `/page/:slug` for non-home pages.
   - Effect: duplicate URL surfaces (`/about` and `/page/about`) and inconsistent canonicalization by default.
   - Files:
     - `apps/web/app/(public)/[contentTypeSlug]/page.tsx`
     - `apps/web/app/(public)/page/[slug]/page.tsx`
     - `apps/web/app/sitemap.ts`

2. **News block links point to page routes (`/page/:slug`) instead of content-item routes (`/news/:slug`).**
   - The `news_list` block renders item links as `/page/${item.slug}` and text “Read page”.
   - This is incorrect for content items and can produce 404s or misrouting if a page with that slug doesn’t exist.
   - File:
     - `apps/web/app/(public)/page/[slug]/blocks/block-registry.tsx`

3. **Unvalidated redirect targets are passed directly to `permanentRedirect` in public runtime.**
   - Redirect data (`redirectTo`) from API is trusted and forwarded directly in page/content routes.
   - Current API builds internal paths today, but runtime has no defense if malformed/absolute URLs ever pass through (data drift, future refactor, or adapter bug).
   - Files:
     - `apps/web/app/(public)/[contentTypeSlug]/page.tsx`
     - `apps/web/app/(public)/[contentTypeSlug]/[slug]/page.tsx`
     - `apps/web/app/(public)/page/[slug]/page.tsx`

4. **Media API exposes full media listing without auth at `GET /api/v1/media`.**
   - `MediaController.listMedia()` has no role check, while mutating media endpoints do.
   - This exposes media inventory and usage flags publicly.
   - File:
     - `apps/api/src/modules/content/media.controller.ts`

## 2) High-priority improvements

1. **Page-vs-content-type slug collisions are unresolved at data model level.**
   - `Page.slug` is unique among pages; `ContentType.slug` is unique among content types, but there is no cross-entity uniqueness.
   - Because route `/:contentTypeSlug` is shared, collisions (e.g., page slug `news` and content type `news`) are resolved only by runtime precedence (Page wins), which can accidentally shadow archive routes.
   - Files:
     - `packages/db/prisma/schema.prisma`
     - `apps/web/app/(public)/[contentTypeSlug]/page.tsx`

2. **Public content type visibility is implied but not actually enforced in backend response shape.**
   - Frontend mapper checks `public`, `isPublic`, and `visibility`, but API `GET /content/types` only returns `{slug, name, templateKey}`.
   - This means all content types are effectively public in the current contract.
   - Files:
     - `apps/api/src/modules/content/public-content.controller.ts`
     - `apps/web/lib/content.ts`

3. **Hardcoded type-specific paths still exist in otherwise generic runtime.**
   - Functions like `getNewsListing`, `resolveNewsItemBySlug`, `resolveServiceBySlug`, and home CTA defaults are hardwired to `news` / `services`.
   - New content types can render under generic routes, but several UX flows remain opinionated and brittle.
   - File:
     - `apps/web/lib/content.ts`

4. **No explicit slug format validation in DTOs for pages/content items/content types.**
   - Slugs are `@IsString()` but not pattern-constrained (e.g., lowercase URL-safe segments).
   - This risks malformed URLs, ambiguous redirects, and operational cleanup burden.
   - File:
     - `apps/api/src/modules/content/content.controller.ts`

## 3) Medium improvements

1. **Performance: repeated “fetch all then filter/find” in web runtime.**
   - `getPublicContentTypeBySlug` fetches all types then finds one.
   - `resolveContentItemBySlug` + page render + metadata can duplicate fetches for same request path.
   - File:
     - `apps/web/lib/content.ts`

2. **Performance: N+1 media usage scan in API.**
   - `getUsedMediaUrls` loads all content types, then queries items per type.
   - Works for small datasets; degrades with content growth.
   - File:
     - `apps/api/src/modules/content/media.controller.ts`

3. **Template resolution is robustly centralized, but type-level constraints are not surfaced at API boundary.**
   - Unknown template keys safely fall back to `index`, which is good.
   - But there is no published contract for valid template keys; accidental typos silently degrade output.
   - File:
     - `apps/web/app/(public)/templates/template-registry.ts`

## 4) Minor suggestions

1. **Standardize one public URL strategy for pages.**
   - If canonical public pages are `/:slug`, add redirect from `/page/:slug` and update metadata/sitemap defaults accordingly.

2. **Add route conflict diagnostics for editors.**
   - During create/update of Page or ContentType, reject or warn on collisions (`page.slug === contentType.slug`).

3. **Add route-level test matrix for required examples.**
   - Verify:
     - Pages: `/about`, `/contact`
     - Archives: `/news`, `/services`, `/products`
     - Detail: `/news/my-article`, `/services/web-design`
     - Precedence: Page route wins over ContentType archive when same slug exists.

4. **Constrain redirect payload format.**
   - Enforce internal-path-only redirects at API layer (`^/` and no protocol), plus defensive validation in web before redirect.

## 5) Things already well implemented

1. **Route precedence logic for `/:contentTypeSlug` is explicit and correct for “Page first, then ContentType archive”.**
   - The sequence in `[contentTypeSlug]/page.tsx` correctly checks page resolution first.

2. **Published filtering on public content reads is present.**
   - Public page/item endpoints avoid serving unpublished entities.

3. **Template fallback behavior is deterministic and resilient.**
   - Unknown/missing template keys fallback cleanly to `index`.

4. **Global API safety baseline is solid.**
   - ValidationPipe (`whitelist`, `forbidNonWhitelisted`, `transform`), CSRF middleware, CORS allowlist behavior, helmet, and rate limiting are all in place.

5. **Repository/domain separation is generally clean.**
   - Domain interfaces in `packages/domain` and Prisma implementations in `packages/domain-adapters-prisma` are reasonably separated and typed.

## Routing behavior check against requested cases

- **Pages `/about`, `/contact`:** should resolve via `/:contentTypeSlug` route when matching published Pages.
- **Archives `/news`, `/services`, `/products`:** resolve as content-type archives unless a Page of same slug exists (then Page wins by current precedence).
- **Details `/news/my-article`, `/services/web-design`:** resolve via `/:contentTypeSlug/:slug` generic detail route.
- **Page precedence over ContentType:** currently implemented as required.

The main correctness gap is not precedence itself; it is URL canonical consistency and legacy `/page/:slug` usage leaking into metadata, sitemap, and block links.
