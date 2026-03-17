import { redirect } from "next/navigation";
import { getMatches } from "../../../../lib/content";
import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";
import { listAdminTicketSales } from "../../../../lib/admin/tickets";
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

export default async function AdminTicketSalesPage() {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const [matches, sales] = await Promise.all([
    getMatches(),
    listAdminTicketSales(),
  ]);

  return (
    <section className="admin-bookings" aria-labelledby="ticket-sales-heading">
      <div className="admin-bookings__header">
        <h1 id="ticket-sales-heading" className="hero__title">
          Ticket sales
        </h1>
      </div>

      <form
        action={createTicketSaleAction}
        className="admin-bookings__filters"
        style={{ display: "grid", gap: "8px" }}
      >
        <label>
          Match
          <select name="matchId" required>
            <option value="">Select match</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.homeTeam} vs {match.awayTeam}
              </option>
            ))}
          </select>
        </label>
        <label>
          Title
          <input name="title" required type="text" />
        </label>
        <label>
          Description
          <textarea name="description" rows={3} />
        </label>
        <label>
          Sale starts
          <input name="saleStartAt" required type="datetime-local" />
        </label>
        <label>
          Sale ends
          <input name="saleEndAt" required type="datetime-local" />
        </label>
        <label>
          Max tickets
          <input
            name="maxTickets"
            required
            type="number"
            min={1}
            defaultValue={400}
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue="draft">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="sold_out">Sold-out</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>
          Ticket types (JSON)
          <textarea
            name="ticketTypes"
            rows={10}
            defaultValue={DEFAULT_TICKET_TYPES}
          />
        </label>
        <button type="submit" className="button-primary">
          Create ticket sale
        </button>
      </form>

      <ul className="admin-bookings__list">
        {sales.map((sale) => (
          <li key={sale.id} className="admin-bookings__item">
            <p>
              <strong>
                {asText(sale.match.data.homeTeam)} vs{" "}
                {asText(sale.match.data.awayTeam)}
              </strong>
            </p>
            <p>
              {new Date(sale.saleStartAt).toLocaleString()} →{" "}
              {new Date(sale.saleEndAt).toLocaleString()}
            </p>
            <p>Total sold: {sale.totalTicketsSold}</p>
            <p>Status: {sale.status}</p>
            <form action={updateTicketSaleStatusAction}>
              <input type="hidden" name="id" value={sale.id} />
              <select name="status" defaultValue={sale.status}>
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="sold_out">sold-out</option>
                <option value="closed">closed</option>
              </select>
              <button type="submit" className="button-primary">
                Update
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
