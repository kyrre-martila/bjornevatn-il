import { notFound } from "next/navigation";
import { getPublicTicketSale } from "../../../../lib/tickets";
import { submitTicketOrder } from "./actions";
import TicketPurchaseForm from "./TicketPurchaseForm";
import "../tickets.css";

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function TicketPurchasePage({
  params,
  searchParams,
}: {
  params: { matchId: string };
  searchParams?: { orderReference?: string; error?: string };
}) {
  const sale = await getPublicTicketSale(params.matchId);
  if (!sale) {
    notFound();
  }

  const matchDate = asText(sale.match.data.matchDate);
  const homeTeam = asText(sale.match.data.homeTeam);
  const awayTeam = asText(sale.match.data.awayTeam);
  const venue = asText(sale.match.data.venue);

  if (searchParams?.orderReference) {
    return (
      <section className="tickets-page section">
        <div className="container stack stack--sm">
          <h1 className="tickets-page__title">Order reserved</h1>
          <p>
            Order reference: <strong>{searchParams.orderReference}</strong>
          </p>
          <p>
            {homeTeam} vs {awayTeam}
          </p>
          <p>
            {new Date(matchDate).toLocaleString("no-NO")} · {venue}
          </p>
          <ul>
            {sale.ticketTypes.map((ticketType) => (
              <li key={ticketType.name}>{ticketType.name}</li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section
      className="tickets-page section ticket-purchase"
      aria-labelledby="ticket-purchase-heading"
    >
      <div className="container stack stack--sm">
        <h1 id="ticket-purchase-heading" className="tickets-page__title">
          {homeTeam} vs {awayTeam}
        </h1>
        <p className="tickets-page__intro">
          {new Date(matchDate).toLocaleString("no-NO")} · {venue}
        </p>
        {searchParams?.error ? (
          <p className="ticket-purchase__error">
            Some tickets are no longer available. Please try again.
          </p>
        ) : null}

        <form
          action={submitTicketOrder.bind(null, params.matchId)}
          className="ticket-purchase__form"
        >
          <TicketPurchaseForm
            ticketTypes={[...sale.ticketTypes]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((ticketType) => ({
                ...ticketType,
                remaining: ticketType.remaining ?? ticketType.totalAvailable,
              }))}
          />
          <button type="submit" className="tickets-page-card__button">
            Reserve tickets
          </button>
        </form>
      </div>
    </section>
  );
}
