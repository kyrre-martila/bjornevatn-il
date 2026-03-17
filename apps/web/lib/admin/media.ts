import { cookies } from "next/headers";

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
  limit?: number;
  offset?: number;
  mimeType?: string;
  uploadedAfter?: string;
  uploadedBefore?: string;
}): Promise<AdminMedia[]> {
  const query = new URLSearchParams();
  if (typeof pagination?.limit === "number") {
    query.set("limit", String(pagination.limit));
  }
  if (typeof pagination?.offset === "number") {
    query.set("offset", String(pagination.offset));
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

  const queryString = query.size > 0 ? `?${query.toString()}` : "";

  const response = await fetch(`${getApiBase()}/admin/media${queryString}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as AdminMedia[];
}
