const DEFAULT_PUBLIC_API_ORIGIN = "https://api.example.invalid";
const DEFAULT_API_BASE_PATH = "/api/v1";

type Env = Record<string, string | undefined>;

function normalizeValue(value: string | undefined): string {
  return value?.trim() ?? "";
}

function parseOriginCandidate(
  value: string,
  defaultScheme: "http" | "https",
): string | null {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }

  const candidate = /^[a-z][a-z\d+\-.]*:\/\//i.test(normalized)
    ? normalized
    : `${defaultScheme}://${normalized.replace(/^\/+/, "")}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function resolveOrigin(
  value: string | undefined,
  fallback: string,
  defaultScheme: "http" | "https",
): string {
  return (
    parseOriginCandidate(value ?? "", defaultScheme) ||
    parseOriginCandidate(fallback, defaultScheme) ||
    fallback
  );
}

export function getPublicApiOrigin(env: Env = process.env): string {
  return resolveOrigin(
    env.NEXT_PUBLIC_API_URL,
    DEFAULT_PUBLIC_API_ORIGIN,
    "https",
  );
}

export function getInternalApiOrigin(env: Env = process.env): string {
  return resolveOrigin(
    normalizeValue(env.INTERNAL_API_URL) || normalizeValue(env.API_INTERNAL_URL),
    getPublicApiOrigin(env),
    "http",
  );
}

export function getApiBasePath(env: Env = process.env): string {
  const configured = normalizeValue(env.NEXT_PUBLIC_API_BASE_PATH);
  return configured || DEFAULT_API_BASE_PATH;
}

function normalizeBasePath(path: string): string {
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

export function getServerApiBaseUrl(env: Env = process.env): string {
  return `${getInternalApiOrigin(env)}${normalizeBasePath(getApiBasePath(env))}`;
}

export function getBrowserApiBaseUrl(env: Env = process.env): string {
  return `${getPublicApiOrigin(env)}${normalizeBasePath(getApiBasePath(env))}`;
}

export function getApiBaseUrlForRuntime(env: Env = process.env): string {
  return typeof window === "undefined"
    ? getServerApiBaseUrl(env)
    : getBrowserApiBaseUrl(env);
}
