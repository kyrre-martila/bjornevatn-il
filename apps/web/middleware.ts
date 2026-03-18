import { NextResponse, type NextRequest } from "next/server";
import {
  getApiBasePath,
  getInternalApiOrigin,
  getPublicApiOrigin,
} from "./lib/api-config";

const publicApiOrigin = new URL(getPublicApiOrigin()).origin;
const internalApiOrigin = new URL(getInternalApiOrigin()).origin;
const apiBasePath = getApiBasePath().replace(/\/$/, "");
const meEndpoint = `${internalApiOrigin}${apiBasePath}/me`;

function parseOriginAllowlist(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const mediaAllowlistOrigins = parseOriginAllowlist(
  process.env.NEXT_PUBLIC_CSP_MEDIA_ORIGINS,
);

const imgSrcOrigins = [
  "'self'",
  "data:",
  "blob:",
  publicApiOrigin,
  ...mediaAllowlistOrigins,
];

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
  `connect-src 'self' ${publicApiOrigin}`,
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

function detectStagingEnvironment(hostname: string | null): {
  isStaging: boolean;
  label: string;
} {
  const deploymentEnvironment =
    normalizeEnvironmentValue(process.env.DEPLOY_ENV) ||
    normalizeEnvironmentValue(process.env.APP_ENV) ||
    normalizeEnvironmentValue(process.env.NODE_ENV) ||
    "development";

  const environmentLabel = deploymentEnvironment.toUpperCase();
  const isStagingDeployment = deploymentEnvironment === "staging";
  const isStagingDomain = hostname ? isStagingHostname(hostname) : false;

  return {
    isStaging: isStagingDeployment || isStagingDomain,
    label: isStagingDeployment ? environmentLabel : "STAGING DOMAIN",
  };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  const hostname = req.headers.get("host");
  const staging = detectStagingEnvironment(hostname);
  if (staging.isStaging) {
    res.headers.set("x-site-environment", staging.label);
  }

  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return res;
  }

  const authToken = req.cookies.get("access_token")?.value;
  if (!authToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const me = await fetch(meEndpoint, {
      headers: {
        cookie: req.headers.get("cookie") || "",
        authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    });

    if (!me.ok) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return res;
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
