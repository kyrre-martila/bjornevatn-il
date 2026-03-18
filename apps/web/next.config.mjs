function normalizeEnvironmentValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function resolveDeploymentEnvironment(env) {
  return (
    normalizeEnvironmentValue(env.DEPLOY_ENV) ||
    normalizeEnvironmentValue(env.APP_ENV) ||
    normalizeEnvironmentValue(env.NODE_ENV) ||
    "development"
  );
}

function assertValidPublicRuntimeConfig(env) {
  const deploymentEnv = resolveDeploymentEnvironment(env);
  const isHardened =
    deploymentEnv === "production" || deploymentEnv === "staging";

  const apiUrl = env.NEXT_PUBLIC_API_URL?.trim();
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  const apiBasePath = env.NEXT_PUBLIC_API_BASE_PATH?.trim() || "/api/v1";

  if (!apiBasePath.startsWith("/")) {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_BASE_PATH="${apiBasePath}". It must start with '/'.`,
    );
  }

  if (!isHardened) {
    return;
  }

  const missing = [];
  if (!apiUrl) missing.push("NEXT_PUBLIC_API_URL");
  if (!siteUrl) missing.push("NEXT_PUBLIC_SITE_URL");

  if (missing.length > 0) {
    console.warn(
      `Missing recommended web runtime environment variables for ${deploymentEnv}: ${missing.join(", ")}. The build will continue, but explicit public URLs should be configured before deployment.`,
    );
    return;
  }

  let parsedApi;
  let parsedSite;
  try {
    parsedApi = new URL(apiUrl);
    parsedSite = new URL(siteUrl);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SITE_URL must be absolute URLs including protocol (https://...).",
    );
  }

  if (!["http:", "https:"].includes(parsedApi.protocol)) {
    throw new Error(
      `NEXT_PUBLIC_API_URL must use http/https. Received: ${parsedApi.protocol}`,
    );
  }

  if (!["http:", "https:"].includes(parsedSite.protocol)) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must use http/https. Received: ${parsedSite.protocol}`,
    );
  }

  if (parsedApi.pathname && parsedApi.pathname !== "/") {
    throw new Error(
      "NEXT_PUBLIC_API_URL must be an origin without a path. Configure path versioning with NEXT_PUBLIC_API_BASE_PATH (for example /api/v1).",
    );
  }
}

assertValidPublicRuntimeConfig(process.env);

function parseOriginAllowlist(value) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildContentSecurityPolicy(env) {
  const apiOrigin = env.NEXT_PUBLIC_API_URL?.trim()
    ? new URL(env.NEXT_PUBLIC_API_URL).origin
    : null;
  const mediaAllowlistOrigins = parseOriginAllowlist(
    env.NEXT_PUBLIC_CSP_MEDIA_ORIGINS,
  );
  const imageOrigins = [apiOrigin, ...mediaAllowlistOrigins].filter(Boolean);
  const connectOrigins = [apiOrigin].filter(Boolean);

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `img-src 'self' data: blob: ${imageOrigins.join(" ")}`.trim(),
    "font-src 'self' data:",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${connectOrigins.join(" ")}`.trim(),
  ].join("; ");
}

const contentSecurityPolicy = buildContentSecurityPolicy(process.env);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ],
};
export default nextConfig;
