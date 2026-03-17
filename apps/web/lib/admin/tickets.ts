import { cookies } from "next/headers";

export type AdminTicketSale = {
  id: string;
  title: string;
  status: "draft" | "active" | "sold_out" | "closed";
  saleStartAt: string;
  saleEndAt: string;
  totalTicketsSold: number;
  match: { data: Record<string, unknown> };
};

export type AdminTicketOrder = {
  orderReference: string;
  buyerName: string;
  buyerEmail: string;
  match: string;
  quantity: number;
  createdAt: string;
  status: "reserved" | "confirmed" | "cancelled" | "used";
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

export async function listAdminTicketSales(): Promise<AdminTicketSale[]> {
  const response = await fetch(`${getApiBase()}/tickets/admin/sales`, {
    cache: "no-store",
    headers: buildHeaders(),
  });

  if (!response.ok) return [];
  return (await response.json()) as AdminTicketSale[];
}

export async function createAdminTicketSale(
  payload: Record<string, unknown>,
): Promise<boolean> {
  const response = await fetch(`${getApiBase()}/tickets/admin/sales`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return response.ok;
}

export async function updateAdminTicketSaleStatus(
  id: string,
  status: string,
): Promise<boolean> {
  const response = await fetch(
    `${getApiBase()}/tickets/admin/sales/${id}/status`,
    {
      method: "PATCH",
      headers: buildHeaders(),
      body: JSON.stringify({ status }),
      cache: "no-store",
    },
  );

  return response.ok;
}

export async function listAdminTicketOrders(): Promise<AdminTicketOrder[]> {
  const response = await fetch(`${getApiBase()}/tickets/admin/orders`, {
    cache: "no-store",
    headers: buildHeaders(),
  });

  if (!response.ok) return [];
  return (await response.json()) as AdminTicketOrder[];
}

export async function updateAdminTicketOrderStatus(
  orderReference: string,
  status: string,
): Promise<boolean> {
  const response = await fetch(
    `${getApiBase()}/tickets/admin/orders/${orderReference}/status`,
    {
      method: "PATCH",
      headers: buildHeaders(),
      body: JSON.stringify({ status }),
      cache: "no-store",
    },
  );

  return response.ok;
}
