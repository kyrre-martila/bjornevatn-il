import { cookies } from "next/headers";

export type AdminContentFieldType =
  | "text"
  | "textarea"
  | "rich_text"
  | "image"
  | "relation"
  | "media"
  | "contentItem"
  | "page"
  | "date"
  | "boolean";

export type AdminContentFieldDefinition = {
  key: string;
  label?: string;
  description?: string;
  placeholder?: string;
  helpText?: string;
  type: AdminContentFieldType;
  required: boolean;
  relation?: {
    targetType: "contentType" | "page" | "media";
    targetSlug?: string;
    targetModel?: string;
    multiple?: boolean;
  };
};

export type AdminContentType = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isPublic: boolean;
  fields: AdminContentFieldDefinition[];
};

export type AdminContentItem = {
  id: string;
  contentTypeId: string;
  slug: string;
  title: string;
  data: Record<string, unknown>;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  published: boolean;
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

export async function listAdminContentTypes(): Promise<AdminContentType[]> {
  const response = await fetch(`${getApiBase()}/admin/content/types`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as AdminContentType[];
}

export async function listAdminContentItems(
  contentTypeId: string,
  pagination?: { limit?: number; offset?: number },
): Promise<AdminContentItem[]> {
  const query = new URLSearchParams();
  if (typeof pagination?.limit === "number") {
    query.set("limit", String(pagination.limit));
  }
  if (typeof pagination?.offset === "number") {
    query.set("offset", String(pagination.offset));
  }

  const queryString = query.size > 0 ? `?${query.toString()}` : "";

  const response = await fetch(
    `${getApiBase()}/admin/content/items/type/${contentTypeId}${queryString}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as AdminContentItem[];
}
