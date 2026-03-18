import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "../api-config";

export type AdminPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedAdminResponse<T> = {
  items: T[];
  pagination: AdminPagination;
};

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
  validationStatus: "valid" | "used" | "cancelled" | "revoked";
  scanCount: number;
  firstScannedAt: string | null;
  lastScannedAt: string | null;
  lastScannedBy: string | null;
  qrCodePreview: string;
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

export async function listAdminTicketSales(query?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedAdminResponse<AdminTicketSale>> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));

  const response = await fetch(
    `${getApiBase()}/tickets/admin/sales?${params.toString()}`,
    {
      cache: "no-store",
      headers: buildHeaders(),
    },
  );

  if (!response.ok) {
    return {
      items: [],
      pagination: {
        page: query?.page ?? 1,
        pageSize: query?.pageSize ?? 25,
        total: 0,
        totalPages: 1,
      },
    };
  }
  return (await response.json()) as PaginatedAdminResponse<AdminTicketSale>;
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

export async function listAdminTicketOrders(query?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedAdminResponse<AdminTicketOrder>> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));

  const response = await fetch(
    `${getApiBase()}/tickets/admin/orders?${params.toString()}`,
    {
      cache: "no-store",
      headers: buildHeaders(),
    },
  );

  if (!response.ok) {
    return {
      items: [],
      pagination: {
        page: query?.page ?? 1,
        pageSize: query?.pageSize ?? 25,
        total: 0,
        totalPages: 1,
      },
    };
  }
  return (await response.json()) as PaginatedAdminResponse<AdminTicketOrder>;
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
