import { redirect } from "next/navigation";

import { listAdminMatches } from "../../../../lib/admin/matches";
import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminFiltersBar } from "../components/AdminFiltersBar";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSectionCard } from "../components/AdminSectionCard";
import { AdminStatusBadge } from "../components/AdminStatusBadge";

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams?: {
    source?: string;
    upcoming?: "upcoming" | "past";
    ticketSalesEnabled?: "true" | "false";
    page?: string;
    pageSize?: string;
  };
}) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number(searchParams?.pageSize ?? "25") || 25),
  );

  const matches = await listAdminMatches({
    source: searchParams?.source,
    upcoming: searchParams?.upcoming,
    ticketSalesEnabled: searchParams?.ticketSalesEnabled,
    page,
    pageSize,
  });

  const hasActiveFilters = Boolean(
    searchParams?.source || searchParams?.upcoming || searchParams?.ticketSalesEnabled,
  );

  return (
    <section className="admin-list-page">
      <AdminPageHeader
        title="Matches"
        description="Review imported and manual matches with consistent filters, status badges, and ticketing visibility."
      />

      <AdminSectionCard title="Filters" description="Use source, timing, and ticketing filters to narrow the match list.">
        <AdminFiltersBar
          method="get"
          actions={
            <>
              <input type="hidden" name="page" value="1" />
              <input type="hidden" name="pageSize" value={String(pageSize)} />
              <button type="submit" className="button-primary">
                Apply filters
              </button>
            </>
          }
        >
          <label className="admin-filters-bar__field">
            <span>Source</span>
            <select name="source" defaultValue={searchParams?.source ?? ""}>
              <option value="">All sources</option>
              <option value="manual">Manual</option>
              <option value="fotball-no">Fotball.no</option>
            </select>
          </label>
          <label className="admin-filters-bar__field">
            <span>When</span>
            <select name="upcoming" defaultValue={searchParams?.upcoming ?? ""}>
              <option value="">All dates</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </label>
          <label className="admin-filters-bar__field">
            <span>Ticket sales</span>
            <select
              name="ticketSalesEnabled"
              defaultValue={searchParams?.ticketSalesEnabled ?? ""}
            >
              <option value="">All matches</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </label>
        </AdminFiltersBar>
      </AdminSectionCard>

      <AdminSectionCard title="Matches" description="The list shows source, status, ticketing availability, and the latest sync timestamp.">
        {matches.items.length === 0 ? (
          <AdminEmptyState
            title={hasActiveFilters ? "No matches match these filters" : "No matches found"}
            description={
              hasActiveFilters
                ? "Try clearing one or more filters to see a wider match set."
                : "Matches will appear here after they are created manually or pulled in through sync."
            }
            actionHref="/admin/matches/sync"
            actionLabel="Open match sync"
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-results-table">
              <thead>
                <tr>
                  <th scope="col">Fixture</th>
                  <th scope="col">Date</th>
                  <th scope="col">Venue</th>
                  <th scope="col">Source</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ticket sales</th>
                  <th scope="col">Last synced</th>
                </tr>
              </thead>
              <tbody>
                {matches.items.map((match) => (
                  <tr key={match.id}>
                    <td data-label="Fixture">
                      {match.homeTeam} vs {match.awayTeam}
                    </td>
                    <td data-label="Date">{new Date(match.matchDate).toLocaleString("no-NO")}</td>
                    <td data-label="Venue">{match.venue}</td>
                    <td data-label="Source">{match.externalSource}</td>
                    <td data-label="Status">
                      <AdminStatusBadge context="match" value={match.status} />
                    </td>
                    <td data-label="Ticket sales">
                      <AdminStatusBadge
                        context="availability"
                        value={match.ticketSalesEnabled ? "enabled" : "disabled"}
                      />
                    </td>
                    <td data-label="Last synced">
                      {match.lastSyncedAt
                        ? new Date(match.lastSyncedAt).toLocaleString("no-NO")
                        : "Not synced yet"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>

      <AdminPagination
        page={matches.pagination.page}
        totalPages={matches.pagination.totalPages}
        total={matches.pagination.total}
        basePath="/admin/matches"
        query={{
          source: searchParams?.source,
          upcoming: searchParams?.upcoming,
          ticketSalesEnabled: searchParams?.ticketSalesEnabled,
          pageSize: String(pageSize),
        }}
        ariaLabel="Match pages"
      />
    </section>
  );
}
