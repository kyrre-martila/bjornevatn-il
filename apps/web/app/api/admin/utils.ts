import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? "XSRF-TOKEN";

export function getApiBase() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const basePath = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/v1";
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
  return `${api}${normalizedBase}`;
}

export function buildForwardHeaders(includeJsonContentType = false) {
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  if (includeJsonContentType) {
    headers["content-type"] = "application/json";
  }

  const csrfToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  if (csrfToken) {
    headers["x-csrf-token"] = csrfToken;
  }

  return headers;
}
