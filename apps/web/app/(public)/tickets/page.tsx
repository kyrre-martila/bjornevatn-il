import Link from "next/link";
import { listPublicTicketSales } from "../../../lib/tickets";
import "./tickets.css";

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function TicketsPage() {
  const sales = await listPublicTicketSales();

  return (
    <section
      className="tickets-page section"
      aria-labelledby="tickets-page-heading"
    >
      <div className="container stack stack--sm">
        <h1 id="tickets-page-heading" className="tickets-page__title">
          Buy Tickets
        </h1>
        <p className="tickets-page__intro">
          Find upcoming Bjørnevatn IL matches with active ticket sales.
        </p>

        <div className="tickets-page__grid">
          {sales.map((sale) => {
            const homeTeam = asText(sale.match.data.homeTeam);
            const awayTeam = asText(sale.match.data.awayTeam);
            const venue = asText(sale.match.data.venue);
            const matchDate = asText(sale.match.data.matchDate);

            return (
              <article
                key={sale.id}
                className="tickets-page__card tickets-page-card"
              >
                <h2 className="tickets-page-card__title">
                  {homeTeam} vs {awayTeam}
                </h2>
                <p className="tickets-page-card__meta">
                  {new Date(matchDate).toLocaleString("no-NO")}
                </p>
                <p className="tickets-page-card__meta">{venue}</p>
                <Link
                  href={`/tickets/${sale.matchId}`}
                  className="tickets-page-card__button"
                >
                  Buy Tickets
                </Link>
              </article>
            );
          })}
          {sales.length === 0 ? (
            <p className="tickets-page__empty">
              No active ticket sales right now.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
