import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "../api-config";

export type AdminSiteSetting = {
  key: string;
  value: string;
};

function getApiBase() {
  return getServerApiBaseUrl();
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
