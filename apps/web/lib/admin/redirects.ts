import { cookies } from "next/headers";

const DEFAULT_REDIRECTS_LIMIT = 50;
const MAX_REDIRECTS_LIMIT = 100;

export type AdminRedirect = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
  createdAt: string;
  updatedAt: string;
};

export type RedirectPagination = {
  offset: number;
  limit: number;
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

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  return headers;
}

function normalizePagination(pagination?: {
  limit?: number;
  offset?: number;
}): RedirectPagination {
  const limit =
    typeof pagination?.limit === "number"
      ? Math.min(MAX_REDIRECTS_LIMIT, Math.max(1, pagination.limit))
      : DEFAULT_REDIRECTS_LIMIT;

  const offset =
    typeof pagination?.offset === "number" && pagination.offset >= 0
      ? pagination.offset
      : 0;

  return { offset, limit };
}

export async function listAdminRedirects(pagination?: {
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminRedirect[]; pagination: RedirectPagination }> {
  const safePagination = normalizePagination(pagination);
  const query = new URLSearchParams();
  query.set("limit", String(safePagination.limit));
  query.set("offset", String(safePagination.offset));

  const response = await fetch(
    `${getApiBase()}/admin/redirects?${query.toString()}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return { items: [], pagination: safePagination };
  }

  return {
    items: (await response.json()) as AdminRedirect[],
    pagination: safePagination,
  };
}
