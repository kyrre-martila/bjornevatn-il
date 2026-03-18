import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "./api-config";

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
  buyerEmailMasked: string;
  status: "reserved" | "confirmed" | "cancelled" | "used";
  tickets: Array<{
    id: string;
    ticketType: string;
    quantity: number;
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
  return getServerApiBaseUrl();
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
  orderToken?: string,
): Promise<TicketOrderSummary | null> {
  const url = new URL(
    `${getApiBase()}/tickets/orders/${encodeURIComponent(orderReference)}`,
  );
  if (orderToken) {
    url.searchParams.set("token", orderToken);
  }

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: buildHeaders(),
  });

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
