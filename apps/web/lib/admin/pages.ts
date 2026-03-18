import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "../api-config";

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
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  published: boolean;
  workflowStatus: "draft" | "in_review" | "approved" | "published" | "archived";
  publishAt: string | null;
  unpublishAt: string | null;
  blocks: AdminPageBlock[];
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

export async function listAdminPages(pagination?: {
  limit?: number;
  offset?: number;
}): Promise<AdminPage[]> {
  const query = new URLSearchParams();
  if (typeof pagination?.limit === "number") {
    query.set("limit", String(pagination.limit));
  }
  if (typeof pagination?.offset === "number") {
    query.set("offset", String(pagination.offset));
  }

  const queryString = query.size > 0 ? `?${query.toString()}` : "";

  const response = await fetch(
    `${getApiBase()}/admin/content/pages${queryString}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return [];
  }

  const pages = (await response.json()) as AdminPage[];
  return pages;
}

export async function getAdminPage(id: string): Promise<AdminPage | null> {
  const response = await fetch(`${getApiBase()}/admin/content/pages/${id}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AdminPage;
}
