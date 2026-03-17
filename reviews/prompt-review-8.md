# Bjørnevatn IL Website – Technical System Review

Date: 2026-03-17  
Scope: Full repository assessment (architecture, modules, data model, services, admin UX, security/performance risks, debt, priorities).  
Constraint honored: No code changes performed.

---

## 1) Architecture overview

### Frontend structure (Next.js)
- `apps/web` is a single Next.js App Router application serving:
  - Public website routes under `app/(public)`.
  - Admin UI routes under `app/(admin)`.
  - Auth routes under `app/(auth)`.
  - Scanner route under `app/scanner`.
- Frontend route handlers under `app/api/*` act as a BFF/proxy layer to the Nest API, with role checks for admin operations.
- Content rendering follows a template-key pattern with centralized mapping/fallback behavior.

**Maturity assessment:** good modular separation, but mixed paradigms (server components, server actions, and API route proxying) increase surface complexity.

### Backend structure (NestJS)
- `apps/api` composes domain modules in `AppModule`: auth, content, users, redirects, staging, clubhouse, tickets, membership, match sync, audit, health, observability.
- Module structure is conventional Nest (controller/service/provider).
- Business logic is mostly service-centric (e.g., `TicketAvailabilityService`, `TicketScanService`, `ClubhouseService`, `MatchesSyncService`, `MediaService`).

**Maturity assessment:** broadly clean module boundaries; some modules are strong vertical slices, others still “foundation-level”.

### Content model system
- Hybrid CMS pattern:
  - Generic content schema (`ContentType`, `ContentItem`, `Page`, block-based pages, SEO fields, revisions, redirects, taxonomies).
  - Club-specific structured models currently represented as seeded content types (Club, Team, PersonRole, Sponsor, News, Match, HomepageSettings, FundingGrant).
- Public content controller exposes strongly reusable APIs (content types/items/pages/navigation/site settings/taxonomies/sitemap).

**Maturity assessment:** flexible and extensible; risk of schema drift because many feature entities are JSON-driven rather than strongly normalized.

### Services and integrations
- Tickets: sale window validation, per-type capacity checks, order creation, QR payload generation, scan logging and validation.
- Clubhouse: overlap/conflict service for approved bookings + blocked periods.
- Match sync: source abstraction exists, with iCal provider currently used even for “fotball.no” source mode as a temporary fallback.
- Media: pluggable storage provider architecture with MIME detection, image metadata validation, upload scanner hook, and provider implementations (local/S3/R2/Supabase).

**Maturity assessment:** service decomposition is generally good; some integrations are intentionally incomplete and flagged by implementation behavior.

### Admin interface architecture
- Admin shell with role-filtered nav.
- Multiple admin submodules exist (content/pages/media/navigation/settings/users/audit/staging/clubhouse/membership/matches/tickets).
- UI behavior differs between modules (table/listing interaction, filter depth, edit workflows), indicating iterative delivery by feature stream.

**Maturity assessment:** broad functional coverage, moderate UX inconsistency.

---

## 2) Feature completion status

| Module | Status | Notes |
|---|---|---|
| Homepage | **usable MVP** | Dynamic sections, weather/news/funding/sponsors toggles, hero logic, SEO metadata in place. |
| Teams | **usable MVP** | List/detail pages implemented; data model rich; presentation still basic and not deeply optimized. |
| News | **usable MVP** | Archive/detail routes and SEO support available through content system. |
| Sponsors | **usable MVP** | Homepage section + content model present, but appears mainly content-driven/simple display. |
| Clubhouse booking | **usable MVP** | Public create flow + admin moderation + blocked periods + conflict checks; lacks anti-spam controls. |
| Ticket sales | **usable MVP** | Public sale listing/order flow + admin sales/orders; reservation model works, but payment/fraud/fulfillment depth is limited. |
| Ticket scanning | **usable MVP** | Scanner UI + validate/confirm with logs and override behavior; operational hardening still needed. |
| Membership system | **usable MVP** | Public application + admin review/status handling + categories/settings; lightweight workflow. |
| Match sync | **prototype** | Core settings + sync run + provider abstraction exist, but “fotball.no” path is not a dedicated provider yet. |
| Media library | **usable MVP** | Upload/list/edit/delete + usage checks + pluggable storage; no advanced transforms/CDN pipeline shown. |
| SEO system | **usable MVP** | Metadata builder, robots, sitemap feed, canonical/noindex support; good baseline coverage. |

---

## 3) Data model review

### Models currently defined (Prisma)
1. User
2. AuditLog
3. Credential
4. Session
5. MagicLink
6. Page
7. PageRevision
8. PageSlugRedirect
9. PageBlock
10. ContentType
11. ContentItem
12. TicketSale
13. Ticket
14. TicketScanLog
15. ContentItemRevision
16. ContentItemSlugRedirect
17. ClubhouseBooking
18. ClubhouseBlockedPeriod
19. MembershipSettings
20. MembershipCategory
21. MembershipApplication
22. NavigationItem
23. RedirectRule
24. SiteSetting
25. FotballNoSettings
26. SiteEnvironmentStatus
27. Media
28. Taxonomy
29. Term
30. ContentItemTerm

### Potential issues identified

#### Duplicated or overlapping fields
- `User` includes both `name`/`displayName` and `firstName`/`lastName` patterns; this often causes inconsistent usage paths.
- SEO and publishing fields are duplicated across `Page` and `ContentItem` (expected in this architecture, but should remain contract-driven to avoid divergence).
- `Ticket.status`, `Ticket.validationStatus`, and `Ticket.isRevoked` overlap semantically; state source-of-truth should be clarified.

#### Inconsistent naming
- Role naming is inconsistent across layers:
  - Prisma enum uses `super_admin`.
  - API role normalization uses `superadmin` internal aliasing.
  - Web RBAC expects `super_admin` but also normalizes `superadmin`.
- Match source naming alternates between enum value `fotball_no` and content payload value `fotball-no`.

#### Enum inconsistencies
- Ticket scan action/result/status enums are consistent internally, but admin UI/service semantics around “override” map to “already_used” result in some paths, which may be semantically ambiguous for audits.

#### Missing indexes / relation risks
- Most key lookup paths are indexed well.
- `Media` lacks explicit indexes on common list filters (`createdAt`, `mimeType`) despite API-level filtering; potential scaling issue.
- JSON-heavy models (`ContentItem.data`, `TicketSale.ticketTypes`) rely on application logic, reducing DB-level integrity and query performance options.

#### Fields that look unused or weakly integrated
- Some environment/staging fields are present for broader platform control but may be only partially surfaced in end-user workflows.
- `uploadedBy` in `Media` is currently optional and often unset in upload flow.

---

## 4) API / service structure review

### Ticket availability
- Dedicated service (`TicketAvailabilityService`) is a positive separation.
- Performs sale window checks, per-type limits, and max total checks using grouped ticket aggregates.
- Reusable and mostly decoupled from UI.

**Assessment:** Well-separated MVP service.

### Booking conflicts
- `ClubhouseService.ensureNoConflicts` checks overlap against approved bookings and blocked periods.
- Invoked in approval and blocked-period create/update flows.

**Assessment:** Correctly centralized conflict logic; good reuse.

### QR validation
- `TicketScanService` handles validate + confirm entry, status resolution, and scan logging.
- Keeps scan logic mostly isolated from controller/UI.

**Assessment:** Good service split; still vulnerable to race conditions under concurrent scans (no explicit transactional guard/optimistic lock around “first valid use”).

### Media storage
- `MediaService` is storage-provider-agnostic and validates file size/MIME/image metadata before storage.
- Scanner hook indicates security-conscious extension point.

**Assessment:** Strong architectural separation and reusability.

### Match sync
- `MatchesSyncService` includes settings, listing, and sync orchestration.
- Provider abstraction exists, but currently routes `fotball_no` to iCal provider fallback.

**Assessment:** Correct abstraction direction but still tightly tied to interim assumptions; not full production sync integration yet.

---

## 5) Admin interface review

### Consistency
- Strengths:
  - Shared admin shell and role-based nav visibility.
  - Broad module coverage is available.
- Gaps:
  - Navigation labeling and IA inconsistencies (e.g., “Taxonomies” label on `/admin/navigation`; duplicate `/admin/content` entries for different intents).
  - Different modules expose different levels of filtering/pagination/action affordance.

### Usability
- Core CRUD/admin tasks are possible across modules.
- Some flows appear operational rather than polished (scanner, ticket order display, content model complexity).

### Missing features (common admin expectations)
- Unified search across modules.
- Bulk actions in ticket/booking/membership workflows.
- More robust error and empty states consistency.
- Stronger audit trace visibility in module-level UIs.

### UI pattern divergence hotspots
- Ticket admin vs membership vs clubhouse pages appear to use different interaction density and list behavior.
- Content/page editing has richer controls than newer modules.

---

## 6) Security risks (obvious/static review)

1. **Public booking and membership submission endpoints appear open without visible anti-automation controls** (rate limiting/challenge/abuse controls not evident in reviewed controllers).
2. **Public order lookup by `orderReference` returns buyer-identifying info and raw QR payload values**; if references are guessed/leaked, data exposure risk exists.
3. **Ticket scan concurrency risk** could allow near-simultaneous validations before status update is persisted.
4. **Role normalization inconsistency** across API/web could cause edge-case authorization mismatches.
5. **File upload security baseline is decent** (size/type checks + scanner hook), but no explicit mention of per-user quotas, signed URL TTL policy, or content disarm pipeline.

No obvious fully unprotected admin routes were seen in sampled modules; admin endpoints generally enforce `requireMinimumRole` checks.

---

## 7) Performance risks

1. **Large admin listing queries without pagination in some services** (e.g., ticket orders, ticket sales include broad relation loads).
2. **In-memory filtering after fetch** in media listing can become expensive at scale.
3. **Homepage loads several datasets in parallel**; acceptable now, but could become heavy if content grows and cache/revalidation policies remain coarse.
4. **JSON-driven querying** for match/content properties reduces index leverage vs normalized columns.
5. **Image delivery strategy** appears basic; no clear resizing/CDN variant strategy in public rendering paths.

---

## 8) Technical debt summary

- **Interim integration debt:** match sync “fotball.no” mode still effectively iCal-backed.
- **Naming debt:** role/source naming conventions vary across layers.
- **State-model debt:** ticket status fields overlap and may drift.
- **UX debt:** admin modules delivered quickly with uneven UX patterns.
- **Placeholder debt:** known placeholder widgets/content remain (e.g., Grasrot embed TODO, social links placeholder).
- **Scalability debt:** some list endpoints are not paginated or filter in application memory.

---

## 9) Recommended next priorities

### High priority
1. **Security hardening pass**
   - Add rate limits / anti-spam for public form endpoints (clubhouse, membership, ticket order).
   - Revisit order lookup exposure model (mask PII, avoid exposing raw QR payload publicly, or require signed retrieval token).
   - Add concurrency-safe ticket scan confirmation logic (transactional compare-and-set semantics).
2. **Authorization normalization cleanup**
   - Standardize role literals (`super_admin` vs `superadmin`) across API/web/domain contracts.
3. **Pagination/perf hardening for admin APIs**
   - Add offset/cursor pagination for ticket orders/sales and other high-growth datasets.

### Medium priority
1. **Match sync productionization**
   - Implement dedicated fotball.no provider and robust mapping/error handling.
2. **Admin UX consistency sprint**
   - Standardize table/filter/action patterns and navigation taxonomy.
3. **Ticket lifecycle simplification**
   - Clarify one source-of-truth state model and document transitions.

### Low priority
1. **Content model cleanup/documentation**
   - Document JSON schema contracts for club-specific content types and audit for unused fields.
2. **Image/media optimization roadmap**
   - Add derivative generation and delivery strategy.
3. **Placeholder removal and polish**
   - Replace remaining placeholder UI integrations.

---

## 10) Overall system state summary

### Architecture health
- **Overall: Good foundation, moderate complexity.**
- Strong baseline architecture (modular Nest API + flexible content system + App Router frontend).
- Several modules are functionally complete at MVP level with clear expansion paths.

### Module readiness
- **Mostly MVP-ready** across homepage/content/admin/booking/tickets/membership/media/SEO.
- **Match sync remains prototype-level** for full production trust.

### Technical risks
- Primary risks are **security hardening**, **scaling behavior on list queries**, and **cross-layer naming/state consistency**.

### Recommended next steps
- Execute a focused **hardening + consistency release** before broad feature expansion:
  1) security and auth normalization,
  2) pagination/performance improvements,
  3) match sync provider completion,
  4) admin UX unification.
