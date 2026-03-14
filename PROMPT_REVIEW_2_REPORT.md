# Prompt Review 2 — Strict production-readiness audit

## Executive summary
- **Overall score:** **6.9 / 10**
- **Top 3 strengths**
  1. Auth model is conceptually coherent (short-lived JWT + server-side `Session` revocation) and is consistently wired in core API auth flows.
  2. Admin RBAC boundaries are present in both API controllers and web route layers for most high-risk mutation paths.
  3. Docs are unusually explicit about what is *not* implemented yet (notably refresh tokens and cloud media providers), reducing false confidence.
- **Top 3 remaining risks**
  1. Auth/runtime parity has practical edge-case mismatches (logout behavior, cookie semantics differences between docs and runtime variants, and weak “already-authenticated” UX control paths).
  2. Editor safety is mixed: safer than many blueprints, but still exposes fragile operations and technical concepts in places that non-technical clients can misuse.
  3. Performance hot paths include multiple fetch-all scans and per-request tree/list assembly patterns that will degrade quickly with realistic content volume.

### Readiness verdict
1. **Local development:** **Yes** (ready).
2. **Staging deployment:** **Mostly yes**, with monitoring and realistic data volume tests required.
3. **First real technical client:** **Borderline yes** (if client tolerates rough edges and can self-govern editorial structure).
4. **First real non-technical client:** **No** (not yet safe enough for day-to-day non-technical operation without guardrails/training).

---

## Findings

## Critical

### 1) Media admin listing performs full-site usage scans on every request
- **Why it matters**
  - `GET /admin/content/media` computes usage by scanning all pages + all content types + all content items before returning media rows. This is a classic O(all content) request path on an admin page expected to be opened frequently.
  - With real content volume, this will produce slow admin interactions and database load spikes.
- **Affected files/modules**
  - `apps/api/src/modules/content/content.controller.ts` (`getReferencedMediaUsage`, used by `listMedia`).
- **Recommended fix**
  - Move usage derivation out of request path:
    - Option A: maintain denormalized usage counters/links on write.
    - Option B: async background job to recompute usage index.
    - Option C: return media list first and lazy-load usage badges.

### 2) Sitemap/content discovery path still uses cross-type full collection scans
- **Why it matters**
  - `getSitemapContentItems` fetches all public types, then paginates through all items for each type for each sitemap run.
  - This is acceptable early, but in production this becomes an expensive repeated background/route computation and may impact response times and infra costs.
- **Affected files/modules**
  - `apps/web/lib/content.ts` (`getSitemapContentItems`, `fetchAllContentItemsByTypeSlug`, `fetchAllSitemapPages`).
  - `apps/web/app/sitemap.ts`.
- **Recommended fix**
  - Introduce a dedicated bulk sitemap endpoint in API (`/public/content/sitemap`) with direct DB-level projection and pagination/cursor support.
  - Consider static file generation in CI/CD for large deployments.

## High

### 3) Logout flow is “best effort” in web UI and can leave valid sessions active
- **Why it matters**
  - UI logout swallows failures and always redirects to `/login`. If API call fails (network/proxy/CORS), server session may remain active and cookie persists, creating confusing pseudo-logout behavior.
  - This is especially risky in shared-machine scenarios.
- **Affected files/modules**
  - `apps/web/app/AppShell.tsx` (`handleLogout`).
  - `apps/api/src/modules/auth/auth.controller.ts` (`logout` requires valid token and only clears cookie after successful revoke).
- **Recommended fix**
  - Web: show explicit failure state when logout fails, retry, and avoid claiming logout success.
  - API: consider clearing cookie even on token parse/revoke failures (defensive client state reset), while still returning proper error telemetry.

### 4) Docs claim strict cookie behavior without sufficiently clarifying runtime exceptions
- **Why it matters**
  - Security docs state strict cookie defaults, but web middleware injects a non-HttpOnly CSRF cookie in non-prod with `SameSite=Lax` and fixed fallback token behavior for dev/CI.
  - This creates parity confusion during staging/local validation and can mask auth/csrf issues.
- **Affected files/modules**
  - `docs/SECURITY.md`.
  - `apps/web/middleware.ts`.
- **Recommended fix**
  - Document exact environment matrix (dev/staging/prod) for `XSRF-TOKEN` attributes and fallback behavior.
  - Ensure staging mirrors prod cookie policies unless explicitly testing relaxed mode.

### 5) Service detail route builds relation context by fetching and flattening full service tree per request
- **Why it matters**
  - `resolveServiceBySlug` fetches single detail + full `mode=tree` set, then flattens and searches for related/child items in memory.
  - Per-request O(N) assembly is costly and scales poorly.
- **Affected files/modules**
  - `apps/web/lib/content.ts` (`resolveServiceBySlug`, tree fetch/flatten logic).
- **Recommended fix**
  - Add API endpoint returning detail + related + children in one optimized query.
  - If tree is needed, cache it aggressively and invalidate on content mutation.

### 6) Editor workflow still allows high-impact structural publishing without preview gates
- **Why it matters**
  - Admin+ roles can change slug/published state/SEO and immediately save live-impacting changes with limited preflight checks.
  - Non-technical operators can unintentionally break URL structure and discoverability.
- **Affected files/modules**
  - `apps/web/app/(admin)/admin/pages/PageEditorClient.tsx`.
  - `apps/web/app/(admin)/admin/content/ContentAdminClient.tsx`.
- **Recommended fix**
  - Add staged publish flow: draft -> preview -> publish confirmation with impact summary (slug changes, indexability changes, canonical changes).

## Medium

### 7) Registration UX/data contract mismatch (UI captures fields backend ignores)
- **Why it matters**
  - Registration form submits `firstName`, `lastName`, `phone`, `birthDate`, `acceptedTerms`, but auth register DTO only handles `email`, `password`, optional `name`.
  - This is a trust issue for production onboarding and compliance assumptions (especially `acceptedTerms`).
- **Affected files/modules**
  - `apps/web/app/(auth)/register/page.tsx`.
  - `apps/api/src/modules/auth/auth.controller.ts` (`RegisterDto`).
- **Recommended fix**
  - Align form + API contract: either persist/validate these fields or remove from initial register flow.

### 8) Technical vocabulary still leaks into editor-facing UX
- **Why it matters**
  - Even with guided inputs, terms like “content model”, “field key”, “relation target”, and slug mechanics are still prominent.
  - Non-technical clients can misconfigure structure or misunderstand intent.
- **Affected files/modules**
  - `apps/web/app/(admin)/admin/content/ContentAdminClient.tsx` (model builder and labels).
  - `apps/web/app/(admin)/admin/pages/PageEditorClient.tsx` (slug/structure controls).
- **Recommended fix**
  - Add strict role-based UX modes: client editor mode vs builder mode, with stronger copy simplification and contextual warnings.

### 9) Taxonomy lookup and relation assembly paths rely on broad list fetches
- **Why it matters**
  - `findTaxonomyTermNamesByItemIdAndTaxonomySlug` fetches all taxonomies then finds by slug in memory.
  - `listTaxonomyRelationsForItem` fetches all taxonomies for each request.
  - Wasteful on larger taxonomies and high-traffic detail pages.
- **Affected files/modules**
  - `apps/api/src/modules/content/public-content.controller.ts`.
- **Recommended fix**
  - Add repository methods for direct slug/id lookup and scoped joins.

### 10) No strict startup validation for web runtime critical env parity
- **Why it matters**
  - API has startup checks; web runtime leans on defaults (`localhost` fallbacks) and does not hard-fail when deployment env is incomplete.
  - Real deployment mistakes can remain silent until runtime request failures.
- **Affected files/modules**
  - `apps/web/lib/api.ts`, `apps/web/lib/me.ts`, deployment docs.
- **Recommended fix**
  - Add web-side env validation at boot/build for required production vars (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, base path consistency).

## Low

### 11) Small implementation quality issues signal review debt
- **Why it matters**
  - Example: duplicate `type: "news_list"` property in public page block mapper indicates avoidable oversight in core response shaping.
  - Not a major failure now, but these are reliability smell indicators.
- **Affected files/modules**
  - `apps/api/src/modules/content/public-content.controller.ts` (`mapPublicPageBlock`).
- **Recommended fix**
  - Tighten lint/test coverage for DTO mapping branches and add snapshot/unit tests for response contracts.

---

## Top 8 improvements to make next (ordered by practical impact)
1. **Introduce a dedicated sitemap/public-index API endpoint** to replace per-type fetch-all assembly in web.
2. **Refactor media usage computation out of request path** (denormalized index or async job).
3. **Make logout deterministic for users** (explicit failure handling + defensive cookie clearing strategy).
4. **Add staged publish workflow** with “impact summary” before live changes.
5. **Align registration UI and backend contract** (including explicit terms persistence policy).
6. **Harden staging/prod cookie-parity docs and behavior matrix** (especially CSRF cookie attributes).
7. **Split admin UI into “client-safe editor mode” and “builder mode” more aggressively** with stricter role UX boundaries.
8. **Add production env validation for web app startup/build** to prevent silent fallback misconfiguration.

---

## What is already good and should not be refactored right now
- Keep the **JWT + server-side `Session` revocation** model (it is a pragmatic baseline for this blueprint stage).
- Keep the explicit **“implemented vs planned”** framing in README/DEPLOY around refresh tokens and cloud media providers.
- Keep the current **RBAC utility approach** (`hasMinimumRole`/`requireMinimumRole`) and layer it consistently, rather than replacing it with a larger auth framework now.
- Keep **content schema flexibility via field definitions**; the issue is not capability, it is role-scoped UX and guardrails.

---

## Final candid assessment
This repo is close to “strong technical blueprint” status, but still not “excellent production blueprint” status.

The largest remaining blockers are not architecture-level rewrites; they are **runtime realism and operator safety**: expensive hot paths, auth UX parity edge cases, and non-technical editorial guardrails that are still too thin for real client teams.
