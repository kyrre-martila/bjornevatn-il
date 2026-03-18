# Review Prompt 2

## 1. Security status
**Classification: acceptable MVP**

- **Public endpoints:** Reasonably protected for MVP. Public auth/order/application/booking paths now have endpoint-specific rate limiting plus a global limiter, and the public submission flows share a challenge-verification hook.
- **Ticket scanning:** Safe enough under concurrent use for MVP. Confirm flow uses a conditional update so only one non-override scan can mark a ticket as used; concurrent losers are returned/logged as already used.
- **Order lookup:** Sufficiently protected for MVP. Lookup now requires a signed expiring token tied to the order reference, and the response is reduced to masked buyer data plus ticket summary.

## 2. Performance status
**Classification: acceptable MVP**

- **Admin lists:** Major operational lists are now paginated with bounded page sizes, including memberships, clubhouse bookings, ticket sales, ticket orders, media, matches, and audit logs.
- **Large queries:** Improved overall. Public content list paths use bounded pagination, and admin modules no longer rely as heavily on fetch-all behavior.
- **Remaining bottlenecks:**
  - Ticket order admin listing still performs a full grouped order-reference scan to compute totals.
  - Ticket sales admin listing still aggregates sold counts across all sales on every request.
  - Public taxonomy lookups still page through all taxonomies and filter in memory for single-taxonomy lookups.

## 3. Admin UX consistency
**Status: mostly consistent**

- Admin modules now largely follow a shared pattern with common page headers, section cards, filters, pagination, and status badges.
- Memberships, matches, clubhouse bookings, and ticket orders feel aligned and much more coherent than before.
- **Still off:** the audit log page still uses an older bespoke layout and pagination style, so it stands out from the newer admin screens.

## 4. Remaining critical risks
- Public taxonomy lookup paths still do repeated full-taxonomy scans on public requests.
- Ticket admin aggregation still includes whole-dataset work that can become an operational bottleneck as ticket volume grows.

## 5. What changed
- Added route-level rate limiting and shared submission challenge hooks for public forms and ticket flows.
- Hardened public ticket order lookup with signed expiring tokens and reduced exposed buyer/ticket data.
- Made ticket scan confirmation concurrency-safe enough for MVP with conditional updates and conflict logging.
- Standardized pagination and shared admin UI patterns across the main operational modules.

## 6. Next best step
**Recommendation: analytics/monitoring/logging**

Now that the system has moved from “obviously unsafe/unbounded” to “acceptable MVP,” the biggest gap is visibility. The next priority should be monitoring rate-limit hits, order lookup failures, scan conflicts, slow public read paths, and admin query latency so the team can validate the recent hardening work under real usage and catch regressions early.
