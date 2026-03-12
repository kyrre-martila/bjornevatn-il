import { validateSecurityConfig } from "../../src/config/security.config";

describe("validateSecurityConfig", () => {
  it("throws when auth-critical secrets are too short", () => {
    expect(() =>
      validateSecurityConfig({
        NODE_ENV: "production",
        JWT_SECRET: "short-secret",
        COOKIE_SECRET: "also-short",
        ENCRYPTION_KEY: "tiny",
      }),
    ).toThrow("must be at least 32 characters long");
  });

  it("passes when auth-critical secrets meet minimum length", () => {
    expect(() =>
      validateSecurityConfig({
        NODE_ENV: "production",
        JWT_SECRET: "j".repeat(32),
        COOKIE_SECRET: "c".repeat(32),
        ENCRYPTION_KEY: "e".repeat(32),
      }),
    ).not.toThrow();
  });
});
