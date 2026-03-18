import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "../api-config";

export type AdminNavigationItem = {
  id: string;
  label: string;
  url: string;
  order: number;
  parentId: string | null;
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

export async function listAdminNavigationItems(): Promise<
  AdminNavigationItem[]
> {
  const response = await fetch(
    `${getApiBase()}/admin/content/navigation-items`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as AdminNavigationItem[];
}
