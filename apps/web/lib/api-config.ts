const DEFAULT_PUBLIC_API_ORIGIN = "https://api.example.invalid";
const DEFAULT_API_BASE_PATH = "/api/v1";

type Env = Record<string, string | undefined>;

function normalizeValue(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function getPublicApiOrigin(env: Env = process.env): string {
  return normalizeValue(env.NEXT_PUBLIC_API_URL) || DEFAULT_PUBLIC_API_ORIGIN;
}

export function getInternalApiOrigin(env: Env = process.env): string {
  return (
    normalizeValue(env.INTERNAL_API_URL) ||
    normalizeValue(env.API_INTERNAL_URL) ||
    getPublicApiOrigin(env)
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
