import { cookies } from "next/headers";

export type AdminMedia = {
  id: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  sizeBytes: number | null;
  originalFilename: string | null;
  storageKey: string | null;
  createdAt: string;
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
}): Promise<AdminMedia[]> {
  const query = new URLSearchParams();
  if (typeof pagination?.limit === "number") {
    query.set("limit", String(pagination.limit));
  }
  if (typeof pagination?.offset === "number") {
    query.set("offset", String(pagination.offset));
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
