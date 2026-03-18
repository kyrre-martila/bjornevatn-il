# Admin UI conventions

Use these patterns when updating existing admin modules so the interface stays consistent.

## List pages
- Start with `AdminPageHeader` for the page title and short context.
- Use `AdminSectionCard` blocks for filters, actions/forms, results, and pagination.
- Prefer `AdminFiltersBar` for GET filters so fields wrap cleanly on mobile.
- Use the shared results patterns:
  - `admin-results-table` for tabular data with multiple columns.
  - `admin-card-list` for compact operational summaries.
- Use `AdminPagination` under the results area.

## Status badges
- Render status values with `AdminStatusBadge`.
- Add or update mappings in `apps/web/lib/admin/status.ts` instead of hardcoding labels or colors in each module.
- Use human-friendly labels such as “Pending review”, “On sale”, and “Checked in”.

## Empty states
- Use `AdminEmptyState`.
- Distinguish between:
  - no data yet, and
  - no results for the current filters.
- Include a next action when there is an obvious follow-up, such as opening match sync or creating a new record.

## Detail pages
- Use `AdminPageHeader` plus `AdminSectionCard` sections.
- Keep summary metadata near the top.
- Group editable admin fields in a dedicated review/actions card.
- Keep timeline or audit-oriented information in a separate section where possible.

## Action hierarchy
- Primary actions belong in `admin-form-actions` and use `.button-primary`.
- Secondary or destructive actions should sit beside the primary action in the same action row and use the shared neutral button styling unless the module already has a stronger existing pattern.
- Place success and error feedback directly above the action row.

## Mobile-first expectations
- Filters should stack first and expand into columns at larger breakpoints.
- Tables must remain readable on small screens by using `data-label` cells with the shared responsive table styles.
- Action rows should wrap instead of overflowing.
- Detail sections should remain readable as single-column cards on mobile.
