import { redirect } from "next/navigation";

import { getDynamicMatches } from "../../../../lib/content";
import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";
import { listAdminTicketSales } from "../../../../lib/admin/tickets";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSectionCard } from "../components/AdminSectionCard";
import { AdminStatusBadge } from "../components/AdminStatusBadge";
import {
  createTicketSaleAction,
  updateTicketSaleStatusAction,
} from "./actions";

const DEFAULT_TICKET_TYPES = JSON.stringify(
  [
    {
      name: "Adult",
      price: 150,
      maxPerOrder: 6,
      totalAvailable: 250,
      description: "Standard adult ticket",
      sortOrder: 1,
    },
    {
      name: "Child",
      price: 80,
      maxPerOrder: 6,
      totalAvailable: 150,
      description: "Children up to 16 years",
      sortOrder: 2,
    },
  ],
  null,
  2,
);

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminTicketSalesPage({
  searchParams,
}: {
  searchParams?: { page?: string; pageSize?: string };
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

  const [matches, sales] = await Promise.all([
    getDynamicMatches(),
    listAdminTicketSales({ page, pageSize }),
  ]);

  return (
    <section className="admin-list-page">
      <AdminPageHeader
        title="Ticket sales"
        description="Create sales windows for matches and keep sale status changes aligned with the shared admin action pattern."
      />

      <AdminSectionCard title="Create ticket sale" description="Use the existing match list and shared form actions to add a new sale.">
        <form action={createTicketSaleAction} className="admin-form-panel">
          <div className="admin-form-panel__grid">
            <label className="admin-form-panel__field">
              <span>Match</span>
              <select name="matchId" required>
                <option value="">Select match</option>
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.homeTeam} vs {match.awayTeam}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-form-panel__field">
              <span>Title</span>
              <input name="title" required type="text" />
            </label>
            <label className="admin-form-panel__field admin-form-panel__field--full">
              <span>Description</span>
              <textarea name="description" rows={3} />
            </label>
            <label className="admin-form-panel__field">
              <span>Sale starts</span>
              <input name="saleStartAt" required type="datetime-local" />
            </label>
            <label className="admin-form-panel__field">
              <span>Sale ends</span>
              <input name="saleEndAt" required type="datetime-local" />
            </label>
            <label className="admin-form-panel__field">
              <span>Max tickets</span>
              <input name="maxTickets" required type="number" min={1} defaultValue={400} />
            </label>
            <label className="admin-form-panel__field">
              <span>Status</span>
              <select name="status" defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="active">On sale</option>
                <option value="sold_out">Sold out</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="admin-form-panel__field admin-form-panel__field--full">
              <span>Ticket types (JSON)</span>
              <textarea name="ticketTypes" rows={10} defaultValue={DEFAULT_TICKET_TYPES} />
            </label>
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="button-primary">
              Create ticket sale
            </button>
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard title="Current sales" description="Review active and historical sales using the same badge and card layout pattern as other operational modules.">
        {sales.items.length === 0 ? (
          <AdminEmptyState
            title="No ticket sales yet"
            description="Create the first sale above to make tickets available for an upcoming match."
          />
        ) : (
          <ul className="admin-card-list" aria-label="Ticket sales">
            {sales.items.map((sale) => (
              <li key={sale.id} className="admin-card-list__item">
                <div className="admin-card-list__row">
                  <div>
                    <h2 className="admin-card-list__title">
                      {asText(sale.match.data.homeTeam)} vs {asText(sale.match.data.awayTeam)}
                    </h2>
                    <p className="admin-card-list__meta">{sale.title}</p>
                  </div>
                  <AdminStatusBadge context="ticketSale" value={sale.status} />
                </div>
                <dl className="admin-key-value-list">
                  <div>
                    <dt>Sale window</dt>
                    <dd>
                      {new Date(sale.saleStartAt).toLocaleString()} →{" "}
                      {new Date(sale.saleEndAt).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt>Total sold</dt>
                    <dd>{sale.totalTicketsSold}</dd>
                  </div>
                </dl>
                <form action={updateTicketSaleStatusAction} className="admin-inline-form">
                  <input type="hidden" name="id" value={sale.id} />
                  <label className="admin-inline-form__field">
                    <span className="sr-only">Update sale status for {sale.title}</span>
                    <select name="status" defaultValue={sale.status}>
                      <option value="draft">Draft</option>
                      <option value="active">On sale</option>
                      <option value="sold_out">Sold out</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                  <button type="submit" className="button-primary">
                    Save status
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </AdminSectionCard>

      <AdminPagination
        page={sales.pagination.page}
        totalPages={sales.pagination.totalPages}
        total={sales.pagination.total}
        basePath="/admin/ticket-sales"
        query={{ pageSize: String(pageSize) }}
        ariaLabel="Ticket sale pages"
      />
    </section>
  );
}
