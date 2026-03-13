import { validateSecurityConfig } from "../../src/config/security.config";

describe("validateSecurityConfig", () => {
  it("throws when auth-critical secrets are too short", () => {
    expect(() =>
      validateSecurityConfig({
        NODE_ENV: "production",
        JWT_SECRET: "short-secret",
        COOKIE_SECRET: "also-short",
      }),
    ).toThrow("must be at least 32 characters long");
  });

  it("throws when secrets are long but weak", () => {
    expect(() =>
      validateSecurityConfig({
        NODE_ENV: "production",
        JWT_SECRET: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        COOKIE_SECRET: "passwordpasswordpasswordpassword",
      }),
    ).toThrow("too weak");
  });

  it("passes when auth-critical secrets are strong", () => {
    expect(() =>
      validateSecurityConfig({
        NODE_ENV: "production",
        JWT_SECRET: "A9!zv8#Qw2@Lm4$Np6%Rt1^Yx3&Bk5*Dd",
        COOKIE_SECRET: "M7@qd2!Vx9#Lp4$Hz6^Tw1%Cn8&Jr3*Qp",
      }),
    ).not.toThrow();
  });
});
