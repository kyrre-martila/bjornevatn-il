import { NextResponse, type NextRequest } from "next/server";

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const apiOrigin = new URL(api).origin;
const apiBasePath = (process.env.NEXT_PUBLIC_API_BASE_PATH || "/api/v1").replace(/\/$/, "");
const meEndpoint = `${apiOrigin}${apiBasePath}/me`;

function parseOriginAllowlist(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const mediaAllowlistOrigins = parseOriginAllowlist(
  process.env.NEXT_PUBLIC_CSP_MEDIA_ORIGINS,
);

const imgSrcOrigins = ["'self'", "data:", "blob:", apiOrigin, ...mediaAllowlistOrigins];

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src ${imgSrcOrigins.join(" ")}`,
  "font-src 'self' data:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${apiOrigin}`,
].join("; ");

function normalizeEnvironmentValue(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeHostname(hostname: string): string {
  return hostname.split(":")[0]?.trim().toLowerCase() ?? "";
}

function isStagingHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;

  return (
    normalized === "staging" ||
    normalized.startsWith("staging.") ||
    normalized.includes("-staging") ||
    normalized.includes(".staging")
  );
}

function normalizeRole(role: string | undefined | null): "admin" | "super_admin" | null {
  if (!role) return null;

  const normalized = role.trim().toLowerCase();
  if (normalized === "superadmin") return "super_admin";
  if (normalized === "admin" || normalized === "super_admin") return normalized;

  return null;
}

const deploymentEnvironment =
  normalizeEnvironmentValue(process.env.DEPLOY_ENV) ||
  normalizeEnvironmentValue(process.env.APP_ENV) ||
  normalizeEnvironmentValue(process.env.NODE_ENV) ||
  "development";

const isHardenedEnvironment =
  deploymentEnvironment === "production" || deploymentEnvironment === "staging";
const isCi = process.env.CI === "true" || process.env.PLAYWRIGHT === "true";
const allowCsrfFallbackToken = !isHardenedEnvironment;

function isStagingProtectedPath(pathname: string): boolean {
  return pathname === "/admin/staging" ||
    pathname.startsWith("/admin/staging/") ||
    pathname === "/api/admin/staging" ||
    pathname.startsWith("/api/admin/staging/");
}

function isAuthenticationPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/")
  );
}

async function validateStagingAccess(req: NextRequest): Promise<{
  allowed: boolean;
  status?: 401 | 403;
}> {
  const accessCookie = req.cookies.get("access")?.value;
  if (!accessCookie) {
    return { allowed: false, status: 401 };
  }

  const apiResponse = await fetch(meEndpoint, {
    headers: {
      cookie: req.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  if (!apiResponse.ok) {
    return { allowed: false, status: 401 };
  }

  const payload = (await apiResponse.json().catch(() => null)) as
    | { user?: { role?: string } }
    | null;

  const role = normalizeRole(payload?.user?.role);
  if (!role) {
    return { allowed: false, status: 403 };
  }

  return { allowed: true };
}

function unauthorizedResponse(req: NextRequest): NextResponse {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Unauthorized: authentication required for staging." },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function forbiddenResponse(req: NextRequest): NextResponse {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Forbidden: admin or superadmin role required for staging." },
      { status: 403 },
    );
  }

  const deniedUrl = new URL("/access-denied", req.url);
  return NextResponse.redirect(deniedUrl);
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const stagingDomain = isStagingHostname(host);
  const stagingPath = isStagingProtectedPath(req.nextUrl.pathname);

  if ((stagingDomain || stagingPath) && !isAuthenticationPath(req.nextUrl.pathname)) {
    const access = await validateStagingAccess(req);
    if (!access.allowed) {
      if (access.status === 401) {
        return unauthorizedResponse(req);
      }
      return forbiddenResponse(req);
    }
  }

  const res = NextResponse.next();

  res.headers.set("Content-Security-Policy", csp);

  if (allowCsrfFallbackToken) {
    const existingValue = req.cookies.get("XSRF-TOKEN")?.value;
    const fallbackValue = isCi ? "test-csrf-token" : undefined;
    const value = existingValue ?? fallbackValue;

    if (value) {
      res.cookies.set("XSRF-TOKEN", value, {
        httpOnly: false,
        sameSite: "lax",
        secure: false,
        path: "/",
      });
    }
  }

  return res;
}

export const config = {
  matcher: ["/login", "/((?!api|_next/static|_next/image|favicon.ico).*)", "/api/admin/staging/:path*"],
};
