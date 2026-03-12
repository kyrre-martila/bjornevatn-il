import { cookies } from "next/headers";

export type AdminSiteSetting = {
  key: string;
  value: string;
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

export async function listAdminSettings(): Promise<AdminSiteSetting[]> {
  const response = await fetch(`${getApiBase()}/admin/content/settings`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as AdminSiteSetting[];
}
