import {
  getApiBasePath,
  getApiBaseUrlForRuntime,
  getPublicApiOrigin,
} from "./api-config";

export const API_BASE_PATH = getApiBasePath();

export const CSRF_COOKIE_NAME =
  process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? "XSRF-TOKEN";

export const STATEFUL_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function ensureAbsoluteUrl(path: string): string {
  if (/^https?:/i.test(path)) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  const apiBaseUrl = getApiBaseUrlForRuntime();
  const apiOrigin = new URL(apiBaseUrl).origin;

  if (normalized.startsWith(API_BASE_PATH)) {
    return `${apiOrigin}${normalized}`;
  }

  const joined = `${API_BASE_PATH}${normalized}`.replace(/\/{2,}/g, "/");
  return `${apiOrigin}${joined}`;
}

export function parseCookieValue(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<string | null>((acc, part) => {
      if (acc) {
        return acc;
      }
      const [key, ...rest] = part.split("=");
      if (decodeURIComponent(key) === name) {
        return decodeURIComponent(rest.join("="));
      }
      return null;
    }, null);
}

export function readBrowserCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  return parseCookieValue(document.cookie, CSRF_COOKIE_NAME);
}

export function resolveApiUrl(path: string): string {
  return ensureAbsoluteUrl(path);
}

function buildLoginRedirectTarget(): string {
  if (typeof window === "undefined") {
    return "/login";
  }

  const next = `${window.location.pathname}${window.location.search}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

function redirectToLoginOnUnauthorized(response: Response): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname === "/login") {
    return;
  }

  const marker = response.headers.get("x-session-expired") ?? "";
  if (response.status === 401 || marker.toLowerCase() === "true") {
    window.location.assign(buildLoginRedirectTarget());
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = ensureAbsoluteUrl(path);
  const requestInit: RequestInit = { ...init };
  requestInit.credentials = init.credentials ?? "include";

  const method = (requestInit.method ?? "GET").toString().toUpperCase();
  const headers = new Headers(init.headers ?? undefined);

  if (STATEFUL_METHODS.has(method)) {
    const token = readBrowserCsrfToken();
    if (token) {
      headers.set("x-csrf-token", token);
    }
  }

  requestInit.headers = headers;

  const response = await fetch(url, requestInit);

  redirectToLoginOnUnauthorized(response);
  return response;
}

export function getCsrfTokenFromCookieHeader(
  cookieHeader: string | null | undefined,
): string | null {
  return parseCookieValue(cookieHeader, CSRF_COOKIE_NAME);
}

export function getApiBaseUrl(): string {
  return getApiBaseUrlForRuntime();
}

export function getBrowserApiOrigin(): string {
  return getPublicApiOrigin();
}

export function createHealthProbeUrl(): string {
  return resolveApiUrl("/health");
}
