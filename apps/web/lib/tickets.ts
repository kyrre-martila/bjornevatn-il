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
  buyerName: string;
  buyerEmail: string;
  status: "reserved" | "confirmed" | "cancelled" | "used";
  tickets: Array<{
    id: string;
    ticketType: string;
    quantity: number;
    qrCodeValue: string;
    validationStatus: "valid" | "used" | "cancelled" | "revoked";
  }>;
  match: { id: string; title: string; data: Record<string, unknown> };
};

export type ScanValidationResult = {
  isValid: boolean;
  reason:
    | "valid"
    | "already-used"
    | "cancelled"
    | "revoked"
    | "not-found"
    | "invalid-qr";
  ticket: {
    id: string;
    buyerName: string;
    ticketType: string;
    orderReference: string;
    validationStatus: "valid" | "used" | "cancelled" | "revoked";
    scanCount: number;
    lastScannedAt: string | null;
  } | null;
  match: { id: string; title: string; data: Record<string, unknown> } | null;
  scanCount: number;
  lastScannedAt: string | null;
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
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
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

export async function getTicketOrderSummary(
  orderReference: string,
): Promise<TicketOrderSummary | null> {
  const response = await fetch(
    `${getApiBase()}/tickets/orders/${encodeURIComponent(orderReference)}`,
    {
      cache: "no-store",
      headers: buildHeaders(),
    },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as TicketOrderSummary;
}

export async function validateTicketScan(
  qrCodeValue: string,
  allowOverride = false,
): Promise<ScanValidationResult | null> {
  const response = await fetch(`${getApiBase()}/tickets/scanner/validate`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ qrCodeValue, allowOverride }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as ScanValidationResult;
}

export async function confirmTicketScan(
  qrCodeValue: string,
  allowOverride = false,
): Promise<ScanValidationResult | null> {
  const response = await fetch(`${getApiBase()}/tickets/scanner/confirm`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ qrCodeValue, allowOverride }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as ScanValidationResult;
}
