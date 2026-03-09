import { cookies } from "next/headers";

export type AdminPageBlockType =
  | "hero"
  | "rich_text"
  | "image"
  | "cta"
  | "news_list";

export type AdminPageBlock = {
  id: string;
  type: AdminPageBlockType;
  order: number;
  data: Record<string, unknown>;
};

export type AdminPage = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: AdminPageBlock[];
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

export async function listAdminPages(): Promise<AdminPage[]> {
  const response = await fetch(`${getApiBase()}/content/pages`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const pages = (await response.json()) as AdminPage[];
  return pages;
}

export async function getAdminPage(id: string): Promise<AdminPage | null> {
  const response = await fetch(`${getApiBase()}/content/pages/${id}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AdminPage;
}
