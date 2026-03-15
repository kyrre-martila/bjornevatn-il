import { NextResponse, type NextRequest } from "next/server";

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const apiOrigin = new URL(api).origin;

function parseOriginAllowlist(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const mediaAllowlistOrigins = parseOriginAllowlist(
  process.env.NEXT_PUBLIC_CSP_MEDIA_ORIGINS,
);

const imgSrcOrigins = ["'self'", "data:", apiOrigin, ...mediaAllowlistOrigins];

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `img-src ${imgSrcOrigins.join(" ")}`,
  "script-src 'self'",
  "style-src 'self'",
  `connect-src 'self' ${apiOrigin}`,
].join("; ");

function normalizeEnvironmentValue(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
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

export function middleware(req: NextRequest) {
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
  matcher: ["/login", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
