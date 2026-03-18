import { redirect } from "next/navigation";
import { listAdminMatches } from "../../../../lib/admin/matches";
import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";

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
  const pageSize = Math.min(100, Math.max(10, Number(searchParams?.pageSize ?? "25") || 25));

  const matches = await listAdminMatches({
    source: searchParams?.source,
    upcoming: searchParams?.upcoming,
    ticketSalesEnabled: searchParams?.ticketSalesEnabled,
    page,
    pageSize,
  });

  return (
    <section className="admin-matches" aria-labelledby="admin-matches-heading">
      <h1 id="admin-matches-heading" className="hero__title">
        Matches
      </h1>

      <form className="admin-matches__filters" method="get">
        <label className="admin-matches__field">
          Source
          <select name="source" defaultValue={searchParams?.source ?? ""}>
            <option value="">All</option>
            <option value="manual">Manual</option>
            <option value="fotball-no">Fotball.no</option>
          </select>
        </label>
        <label className="admin-matches__field">
          When
          <select name="upcoming" defaultValue={searchParams?.upcoming ?? ""}>
            <option value="">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </label>
        <label className="admin-matches__field">
          Ticket sales
          <select
            name="ticketSalesEnabled"
            defaultValue={searchParams?.ticketSalesEnabled ?? ""}
          >
            <option value="">All</option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>
        <input type="hidden" name="page" value="1" />
        <input type="hidden" name="pageSize" value={String(pageSize)} />
        <button type="submit" className="button-primary">
          Filter
        </button>
      </form>

      <div className="admin-matches__table-wrap">
        <table className="admin-matches__table">
          <thead>
            <tr>
              <th>Home</th>
              <th>Away</th>
              <th>Date</th>
              <th>Venue</th>
              <th>Source</th>
              <th>Status</th>
              <th>Tickets</th>
              <th>Last synced</th>
            </tr>
          </thead>
          <tbody>
            {matches.items.map((match) => (
              <tr key={match.id}>
                <td>{match.homeTeam}</td>
                <td>{match.awayTeam}</td>
                <td>{new Date(match.matchDate).toLocaleString("no-NO")}</td>
                <td>{match.venue}</td>
                <td>{match.externalSource}</td>
                <td>{match.status}</td>
                <td>{match.ticketSalesEnabled ? "Yes" : "No"}</td>
                <td>
                  {match.lastSyncedAt
                    ? new Date(match.lastSyncedAt).toLocaleString("no-NO")
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>Page {matches.pagination.page} of {matches.pagination.totalPages} ({matches.pagination.total} total)</p>
    </section>
  );
}
