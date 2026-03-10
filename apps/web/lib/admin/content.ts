import { cookies } from "next/headers";

export type AdminContentFieldType =
  | "text"
  | "textarea"
  | "rich_text"
  | "image"
  | "date"
  | "boolean";

export type AdminContentFieldDefinition = {
  key: string;
  label: string;
  type: AdminContentFieldType;
  required: boolean;
};

export type AdminContentType = {
  id: string;
  name: string;
  slug: string;
  description: string;
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
  const response = await fetch(`${getApiBase()}/content/types`, {
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
): Promise<AdminContentItem[]> {
  const response = await fetch(
    `${getApiBase()}/content/items/type/${contentTypeId}`,
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
