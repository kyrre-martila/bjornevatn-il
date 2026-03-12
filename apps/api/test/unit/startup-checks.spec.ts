import {
  assertMigrationsApplied,
  resolveCorsOrigins,
  validateRequiredEnvVariables,
} from "../../src/config/startup-checks";

describe("startup checks", () => {
  describe("validateRequiredEnvVariables", () => {
    it("throws when required environment variables are missing", () => {
      expect(() =>
        validateRequiredEnvVariables({
          DATABASE_URL: "",
          JWT_SECRET: "",
          COOKIE_SECRET: "cookie-secret",
          ENCRYPTION_KEY: undefined,
        }),
      ).toThrow(
        "Missing required environment variables: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY",
      );
    });

    it("does not throw when all required environment variables are present", () => {
      expect(() =>
        validateRequiredEnvVariables({
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/appdb",
          JWT_SECRET: "jwt-secret",
          COOKIE_SECRET: "cookie-secret",
          ENCRYPTION_KEY: "encryption-key",
        }),
      ).not.toThrow();
    });
  });

  describe("resolveCorsOrigins", () => {
    it("returns configured origins when API_CORS_ORIGINS is set", () => {
      expect(
        resolveCorsOrigins({
          API_CORS_ORIGINS:
            "https://admin.example.org, https://www.example.org",
          NODE_ENV: "production",
        }),
      ).toEqual(["https://admin.example.org", "https://www.example.org"]);
    });

    it("throws in production when API_CORS_ORIGINS is missing", () => {
      expect(() =>
        resolveCorsOrigins({
          NODE_ENV: "production",
          API_CORS_ORIGINS: "",
        }),
      ).toThrow("Missing required API_CORS_ORIGINS for production startup");
    });

    it("falls back to local development origins outside production", () => {
      expect(
        resolveCorsOrigins({
          NODE_ENV: "development",
          API_CORS_ORIGINS: "",
        }),
      ).toEqual(["http://localhost:3000", "http://127.0.0.1:3000"]);
    });
  });

  describe("assertMigrationsApplied", () => {
    it("throws when migration metadata table is missing", async () => {
      const prisma = {
        $queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([{ migration_table: null }]),
      };

      await expect(assertMigrationsApplied(prisma as never)).rejects.toThrow(
        "Database migrations have not been run",
      );
    });

    it("throws when no completed migrations exist", async () => {
      const prisma = {
        $queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([{ migration_table: '"_prisma_migrations"' }])
          .mockResolvedValueOnce([{ count: 0 }]),
      };

      await expect(assertMigrationsApplied(prisma as never)).rejects.toThrow(
        "no applied Prisma migrations were found",
      );
    });

    it("passes when at least one migration has been applied", async () => {
      const prisma = {
        $queryRawUnsafe: jest
          .fn()
          .mockResolvedValueOnce([{ migration_table: '"_prisma_migrations"' }])
          .mockResolvedValueOnce([{ count: 1 }]),
      };

      await expect(
        assertMigrationsApplied(prisma as never),
      ).resolves.toBeUndefined();
    });
  });
});
