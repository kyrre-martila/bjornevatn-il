# Prompt Review 7 — Full Post-Run Production and Scope Audit

## 1) Executive summary

- **Overall score:** **8.1 / 10**.
- **Current maturity level:** **late-stage blueprint / early production template** (strong core platform with a few high-impact operational and contract gaps).
- **Suitability verdict:**
  - **Local development:** **Yes** (strong).
  - **Staging deployment:** **Mostly yes**, with one major UX/API mismatch for staging push and OpenAPI drift still unresolved.
  - **Agency production (technical teams):** **Conditionally yes**, if contract governance and a few workflow/architecture guardrails are tightened.
  - **Non-technical client editors:** **Mostly yes** for normal editorial workflows, but still not fully safe for “set-and-forget” agency operations without stricter policy toggles and UX hardening on high-impact operations.

## 2) Strongest areas (keep as-is)

1. **Role model and baseline RBAC are now practical** for agency workflows (`editor` / `admin` / `super_admin`) and are consistently applied in many admin endpoints.
2. **Content platform capabilities are now realistically broad** (pages, content types/items, media, revisions, redirects, settings, taxonomy relations).
3. **Publish-window behavior is practical for simple deployments** (request-time `publishAt`/`unpublishAt` enforcement without mandatory background scheduler).
4. **Revision lifecycle controls are sensible** (history + restore + retention pruning script).
5. **Deployment docs and runbook surface area are much more complete** than a typical blueprint (smoke tests, staging flow docs, operations docs, security docs).
6. **Public read paths now show better performance intent** via bounded pagination and sitemap batching loops instead of naive fetch-all behavior.

## 3) Remaining weaknesses (most important)

1. **OpenAPI artifact still drifts from implementation** when regenerated, which undermines SDK/client trust.
2. **Staging push-to-live from web admin appears broken by contract mismatch** (`confirmPushToLive=true` required by API but not sent by web client flow).
3. **Architecture drift is present**: some controllers still call Prisma directly instead of going through repository/service boundaries.
4. **Route-family duplication persists** (`admin/content/media` and `admin/media`) increasing maintenance and contract complexity.
5. **Some public taxonomy flows still do repeated full-taxonomy scans per request path**, which can become expensive with scale.
6. **Contract tests remain too narrow** for the implemented admin surface.

## 4) Findings grouped by severity

### Critical

#### 1. OpenAPI contract drift is still present in repository workflow

- **Why it matters:** The blueprint promises generated contracts/SDKs, but drift means generated clients can be out of date in production.
- **Affected files/modules:**
  - `packages/contracts/openapi.v1.json`
  - `apps/api/scripts/generate-openapi.ts`
  - `.github/workflows/tools.yml`
- **Evidence:** Running `pnpm generate:openapi` produces a non-empty diff (e.g., staging endpoints appear in generated output).
- **Recommended fix:**
  1. Fix generation source so staging endpoints are deterministic in committed spec.
  2. Keep the drift check as required CI gate.
  3. Add PR checklist item requiring `generate:openapi` run whenever controller route shape changes.

### High

#### 2. Staging push-to-live web flow likely fails due to missing confirmation payload

- **Why it matters:** High-impact operational action appears unusable from the admin web UI; this is a production operations blocker.
- **Affected files/modules:**
  - `apps/api/src/modules/staging/staging.controller.ts`
  - `apps/web/app/(admin)/admin/staging/StagingControlsClient.tsx`
  - `apps/web/app/api/admin/staging/push-live/route.ts`
  - `apps/web/app/api/admin/upstream.ts`
- **Evidence:** API enforces `confirmPushToLive === true`; the web client issues `fetch(..., { method: "POST" })` with no JSON body, and the proxy forwards request text as-is.
- **Recommended fix:**
  - Send explicit JSON payload from UI/proxy: `{ "confirmPushToLive": true, "confirmationToken": ... }` (token optional by env).
  - Add integration test covering this happy path and expected failure path.

#### 3. Repository/service boundary is inconsistent (controller-level Prisma usage)

- **Why it matters:** This increases coupling, weakens testability, and creates drift from the domain/repository architecture used elsewhere.
- **Affected files/modules:**
  - `apps/api/src/modules/redirects/redirects.controller.ts`
  - `apps/api/src/modules/health/health.controller.ts`
  - `apps/api/src/modules/audit/audit.service.ts` (direct DB access is acceptable in infra service, but pattern is mixed across modules)
- **Recommended fix:**
  - Move redirects persistence to a dedicated repository/service pair.
  - Keep health direct query if desired, but formally document it as an exception pattern.

#### 4. Duplicate media route families add avoidable complexity

- **Why it matters:** Two admin media APIs increase surface area, contract size, and long-term drift risk even if RBAC is currently aligned.
- **Affected files/modules:**
  - `apps/api/src/modules/content/content.controller.ts` (`admin/content/media/*`)
  - `apps/api/src/modules/content/media.controller.ts` (`admin/media/*`)
  - `packages/contracts/openapi.v1.json`
- **Recommended fix:**
  - Deprecate one route family (prefer `admin/media/*`), keep temporary compatibility aliases with deprecation timeline.

### Medium

#### 5. Public taxonomy lookup path repeatedly scans all taxonomies

- **Why it matters:** This can degrade under larger content catalogs and taxonomy counts.
- **Affected files/modules:**
  - `apps/api/src/modules/content/public-content.controller.ts` (`listAllTaxonomies`, taxonomy-related endpoints)
- **Recommended fix:**
  - Add targeted repository methods (`findBySlug`, `findByIds`) to avoid full-table pagination loops for single-taxonomy lookups.
  - Consider short-lived cache for taxonomy slug->id map.

#### 6. Contract conformance tests do not match feature surface

- **Why it matters:** Most implemented admin endpoints are not contract-validated in runtime tests, so drift can pass unnoticed.
- **Affected files/modules:**
  - `apps/api/test/contract/openapi-contract.spec.ts`
- **Recommended fix:**
  - Extend conformance tests to representative admin paths: media upload/delete, redirects CRUD, staging status/actions, revisions list/restore, role patching.

#### 7. Scope has grown into “mini CMS platform”; governance controls are still partly convention-based

- **Why it matters:** For non-technical clients, policy enforcement should be explicit and configurable, not only process-driven.
- **Affected files/modules:**
  - `README.md` (approval workflow still marked planned)
  - `apps/api/src/modules/content/content.controller.ts` (workflow transitions)
- **Recommended fix:**
  - Add optional strict workflow policy mode (feature flag): e.g., only admins can transition `in_review -> published`, prevent direct editor publish in strict mode.

### Low

#### 8. UI information architecture is getting crowded for non-technical admins

- **Why it matters:** As features grow, navigation and action density can increase accidental misuse.
- **Affected files/modules:**
  - `apps/web/app/(admin)/admin/layout.tsx`
  - various admin client pages under `apps/web/app/(admin)/admin/*`
- **Recommended fix:**
  - Add role-sensitive grouping and “advanced” sections by default collapsed.
  - Keep destructive actions behind explicit confirmation patterns (already partially present).

## 5) Scope verdict

- **Is this blueprint still within intended scope?** **Yes**, but at the upper edge of scope for a “blueprint.”
- **Is it becoming too complex?** **Moderately** in specific areas (duplicate route families, very large content controller, staging ops complexity). This is manageable if boundaries are tightened.
- **Is anything important still missing?** **Yes, mostly operational policy controls rather than new platform modules:** stricter workflow-policy mode, richer contract tests, and clearer deprecation/compatibility strategy.
- **What should be tested in practice instead of further abstracted?**
  1. Real editor publishing lifecycle with 2–3 roles and rollback scenarios.
  2. Staging reset/push/delete end-to-end on target infrastructure (single VM / docker-compose).
  3. Performance with realistic content volume (thousands of content items, hundreds of redirects, long audit trails).
  4. Disaster-recovery runbooks (restore DB + uploads + smoke tests).

## 6) Top 10 next improvements (by practical impact)

1. **Fix staging push web payload mismatch** (`confirmPushToLive`) and add integration tests.
2. **Resolve OpenAPI generation drift** and enforce deterministic contract updates on every route change.
3. **Expand contract/runtime tests beyond auth/me to key admin and staging endpoints.**
4. **Deprecate one media route family** and document migration timeline.
5. **Extract redirects persistence behind repository/service boundary.**
6. **Optimize taxonomy lookup paths** to avoid repeated full scans.
7. **Introduce strict optional workflow policy mode** for agency teams with non-technical editors.
8. **Split the large content controller into clearer bounded sub-controllers/services** (pages/content/settings/media schema), no rewrite required.
9. **Add production guardrail checklist automation** (preflight command for env + migrations + storage + mail + staging vars).
10. **Run recurring scale smoke tests in CI/nightly** for list endpoints and sitemap generation with seeded large datasets.

## 7) What should NOT be changed

1. **Keep cookie/session-first auth model with server-side session validation** as the baseline.
2. **Keep request-time scheduling enforcement** for `publishAt` / `unpublishAt` as default simplicity path.
3. **Keep revision retention pruning approach** (operationally predictable and suitable for this scope).
4. **Keep explicit role hierarchy (`editor`/`admin`/`super_admin`)** rather than prematurely introducing fine-grained policy engines.
5. **Keep deployment target realism (single VM/homelab/VPS + Docker)** instead of introducing platform-heavy assumptions.
