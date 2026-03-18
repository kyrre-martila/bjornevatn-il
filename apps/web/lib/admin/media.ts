import { cookies } from "next/headers";

export type AdminMediaPagination = { page: number; pageSize: number; total: number; totalPages: number };
export type AdminMediaListResponse = { items: AdminMedia[]; pagination: AdminMediaPagination; filters?: Record<string, unknown> };

export type AdminMedia = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  url: string;
  storageKey: string | null;
  altText: string | null;
  caption: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
  isUsed?: boolean;
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

export async function listAdminMedia(pagination?: {
  page?: number;
  pageSize?: number;
  mimeType?: string;
  uploadedAfter?: string;
  uploadedBefore?: string;
  search?: string;
}): Promise<AdminMediaListResponse> {
  const query = new URLSearchParams();
  if (typeof pagination?.page === "number") {
    query.set("page", String(pagination.page));
  }
  if (typeof pagination?.pageSize === "number") {
    query.set("pageSize", String(pagination.pageSize));
  }
  if (pagination?.mimeType) {
    query.set("mimeType", pagination.mimeType);
  }
  if (pagination?.uploadedAfter) {
    query.set("uploadedAfter", pagination.uploadedAfter);
  }
  if (pagination?.uploadedBefore) {
    query.set("uploadedBefore", pagination.uploadedBefore);
  }
  if (pagination?.search) {
    query.set("search", pagination.search);
  }

  const queryString = query.size > 0 ? `?${query.toString()}` : "";

  const response = await fetch(`${getApiBase()}/admin/media${queryString}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    return { items: [], pagination: { page: pagination?.page ?? 1, pageSize: pagination?.pageSize ?? 50, total: 0, totalPages: 1 } };
  }

  return (await response.json()) as AdminMediaListResponse;
}
