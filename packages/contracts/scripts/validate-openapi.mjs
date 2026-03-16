import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const specPath = path.join(packageDir, "openapi.v1.json");

const raw = await readFile(specPath, "utf-8");
let spec;
try {
  spec = JSON.parse(raw);
} catch (error) {
  console.error("contracts: failed to parse openapi.v1.json");
  throw error;
}

if (typeof spec.openapi !== "string" || !spec.openapi.startsWith("3.0.")) {
  throw new Error(
    `contracts: expected OpenAPI 3.0.x document, received ${spec.openapi ?? "unknown"}`,
  );
}

const paths = spec.paths ?? {};
const pathKeys = Object.keys(paths);
const allowedNonVersionedPaths = new Set(["/health"]);
for (const key of pathKeys) {
  if (!key.startsWith("/api/v1") && !allowedNonVersionedPaths.has(key)) {
    throw new Error(
      `contracts: invalid path '${key}' – endpoints must be under /api/v1 or explicitly allowlisted`,
    );
  }
}

const bannedPatterns = [/devtoken/i, /debug/i];
for (const pattern of bannedPatterns) {
  if (pattern.test(raw)) {
    throw new Error(
      `contracts: detected disallowed field matching ${pattern} in OpenAPI document`,
    );
  }
}

const requiredExactRoutes = [
  "/api/v1/admin/content/pages/{id}/revisions",
  "/api/v1/admin/content/pages/{id}/revisions/{revisionId}",
  "/api/v1/admin/content/pages/{id}/revisions/{revisionId}/restore",
  "/api/v1/admin/content/items/{id}/revisions",
  "/api/v1/admin/content/items/{id}/revisions/{revisionId}",
  "/api/v1/admin/content/items/{id}/revisions/{revisionId}/restore",
  "/api/v1/admin/staging/status",
  "/api/v1/admin/staging/reset-from-live",
  "/api/v1/admin/staging/push-to-live",
];

for (const route of requiredExactRoutes) {
  if (!pathKeys.includes(route)) {
    throw new Error(`contracts: required route missing from OpenAPI spec: ${route}`);
  }
}

const requiredRouteGroupPrefixes = [
  "/api/v1/admin/content/",
  "/api/v1/admin/staging/",
  "/api/v1/public/content/",
];

for (const prefix of requiredRouteGroupPrefixes) {
  const hasGroup = pathKeys.some((route) => route.startsWith(prefix));
  if (!hasGroup) {
    throw new Error(`contracts: required route group missing from OpenAPI spec: ${prefix}*`);
  }
}

console.log("contracts: OpenAPI document validated successfully");
