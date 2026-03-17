import { cookies } from "next/headers";

export type PublicTicketSale = {
  id: string;
  matchId: string;
  title: string;
  description?: string;
  ticketTypes: Array<{
    name: string;
    price: number;
    maxPerOrder: number;
    totalAvailable: number;
    description?: string;
    sortOrder: number;
    remaining?: number;
  }>;
  saleStartAt: string;
  saleEndAt: string;
  maxTickets: number;
  status: "draft" | "active" | "sold_out" | "closed";
  match: {
    id: string;
    title: string;
    data: Record<string, unknown>;
  };
};

export type TicketOrderSummary = {
  orderReference: string;
  tickets: Array<{ ticketType: string; quantity: number }>;
  match: { id: string; title: string; data: Record<string, unknown> };
};

function getApiBase() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const basePath = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/v1";
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
  return `${api}${normalizedBase}`;
}

function buildHeaders() {
  const cookieHeader = cookies().toString();
  const headers: Record<string, string> = {};
  if (cookieHeader) headers.cookie = cookieHeader;
  return headers;
}

export async function listPublicTicketSales(): Promise<PublicTicketSale[]> {
  const response = await fetch(`${getApiBase()}/tickets/sales/public`, {
    cache: "no-store",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as PublicTicketSale[];
}

export async function getPublicTicketSale(
  matchId: string,
): Promise<PublicTicketSale | null> {
  const response = await fetch(
    `${getApiBase()}/tickets/sales/public/match/${matchId}`,
    {
      cache: "no-store",
      headers: buildHeaders(),
    },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PublicTicketSale;
}
