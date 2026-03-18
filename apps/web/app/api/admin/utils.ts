import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "../../../lib/api-config";

const CSRF_COOKIE_NAME =
  process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? "XSRF-TOKEN";

export function getApiBase() {
  return getServerApiBaseUrl();
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
