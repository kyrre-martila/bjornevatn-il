import { PrismaService } from "../prisma/prisma.service";
import { assertMediaStorageProviderSupported } from "../modules/content/media-storage-provider.config";
import { isHardenedEnvironment, type Env } from "./runtime-env";


const DEVELOPMENT_CORS_DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
] as const;

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "COOKIE_SECRET",
] as const;


function resolveIsTestEnv(env: Env): boolean {
  return (env.NODE_ENV ?? "").trim().toLowerCase() === "test";
}
export function validateRequiredEnvVariables(env: Env = process.env) {
  if (resolveIsTestEnv(env)) {
    return;
  }

  const missing = REQUIRED_ENV_VARS.filter((name) => {
    const value = env[name];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Please set these values in your .env file before starting the API.`,
    );
  }

  assertMediaStorageProviderSupported(env);
}

export function resolveCorsOrigins(env: Env = process.env): string[] {
  const configuredOrigins =
    env.API_CORS_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (isHardenedEnvironment(env)) {
    throw new Error(
      "Missing required API_CORS_ORIGINS for hardened startup (production/staging). Set API_CORS_ORIGINS to a comma-separated list of trusted origins (for example: https://admin.your-domain.com,https://www.your-domain.com).",
    );
  }

  return [...DEVELOPMENT_CORS_DEFAULT_ORIGINS];
}

export async function assertMigrationsApplied(prisma: PrismaService) {
  const tableRows = (await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public."_prisma_migrations"')::text AS migration_table`,
  )) as Array<{ migration_table: string | null }>;

  if (!tableRows[0]?.migration_table) {
    throw new Error(
      "Database migrations have not been run: '_prisma_migrations' table is missing. Run migrations before starting the API (for example: `pnpm --filter @blueprint/db exec prisma migrate deploy`).",
    );
  }

  const countRows = (await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
  )) as Array<{ count: number | string }>;

  const appliedMigrations = Number(countRows[0]?.count ?? 0);
  if (!Number.isFinite(appliedMigrations) || appliedMigrations < 1) {
    throw new Error(
      "Database migrations have not been run: no applied Prisma migrations were found. Run migrations before starting the API (for example: `pnpm --filter @blueprint/db exec prisma migrate deploy`).",
    );
  }
}
