jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { HttpException, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";

import { AuthController } from "../../src/modules/auth/auth.controller";
import type { AuthService } from "../../src/modules/auth/auth.service";
import type { AuditService } from "../../src/modules/audit/audit.service";

describe("AuthController", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  function makeReq(): Request {
    return {
      ip: "127.0.0.1",
      headers: { "user-agent": "jest" },
      secure: false,
      cookies: {},
    } as unknown as Request;
  }

  function makeRes(): Response {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;
  }

  function makeSut(input?: {
    registrationEnabled?: boolean;
    allowPublicRegistrationInHardenedEnv?: boolean;
    loginError?: Error;
  }) {
    const auth = {
      register: jest.fn().mockResolvedValue({
        user: {
          id: "user-1",
          email: "new@example.com",
          name: "New User",
          role: "editor",
        },
        accessToken: "access-token",
      }),
      login: input?.loginError
        ? jest.fn().mockRejectedValue(input.loginError)
        : jest.fn().mockResolvedValue({
            user: {
              id: "user-1",
              email: "new@example.com",
              name: "New User",
              role: "editor",
            },
            accessToken: "access-token",
          }),
      decodeToken: jest.fn().mockReturnValue({ exp: 9999999999 }),
      revokeSessionFromToken: jest.fn(),
      refreshAccessToken: jest.fn().mockResolvedValue({
        user: {
          id: "user-1",
          email: "new@example.com",
          name: "New User",
          role: "editor",
        },
        accessToken: "access-token",
      }),
    } as unknown as jest.Mocked<AuthService>;

    const config = {
      get: jest.fn((key: string) => {
        if (key === "REGISTRATION_ENABLED") {
          return input?.registrationEnabled === false ? "false" : "true";
        }
        if (key === "ALLOW_PUBLIC_REGISTRATION_IN_HARDENED_ENV") {
          return input?.allowPublicRegistrationInHardenedEnv ? "true" : "false";
        }
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const audit = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    const controller = new AuthController(auth, config, audit);

    return { controller, auth, audit };
  }

  it("logs registration event", async () => {
    const { controller, audit } = makeSut();

    await controller.register(
      { email: "new@example.com", password: "password123", name: "New User" },
      makeReq(),
      makeRes(),
    );

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "registration",
        entityType: "user",
        entityId: "user-1",
      }),
    );
  });

  it("logs failed login attempts", async () => {
    const { controller, audit } = makeSut({
      loginError: new UnauthorizedException("Invalid credentials"),
    });

    await expect(
      controller.login(
        { email: "Nope@Example.com", password: "bad-password" },
        makeReq(),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "login_failed",
        entityType: "session",
        metadata: expect.objectContaining({
          actor: expect.objectContaining({
            email: "nope@example.com",
          }),
          reason: "invalid_credentials",
        }),
      }),
    );
  });

  it("refreshes access token for an active session", async () => {
    const { controller, auth } = makeSut();

    await controller.refresh(
      {
        ...makeReq(),
        cookies: { access: "old-access-token" },
      } as unknown as Request,
      makeRes(),
    );

    expect(auth.refreshAccessToken).toHaveBeenCalledWith("old-access-token");
  });

  it("blocks registration when disabled", async () => {
    const { controller, audit } = makeSut({ registrationEnabled: false });

    await expect(
      controller.register(
        { email: "new@example.com", password: "password123", name: "New User" },
        makeReq(),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(audit.log).not.toHaveBeenCalled();
  });

  it("blocks registration in hardened environments without explicit override", async () => {
    process.env.NODE_ENV = "production";
    const { controller } = makeSut({
      registrationEnabled: true,
      allowPublicRegistrationInHardenedEnv: false,
    });

    await expect(
      controller.register(
        { email: "new@example.com", password: "password123", name: "New User" },
        makeReq(),
        makeRes(),
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it("allows registration in hardened environments with explicit override", async () => {
    process.env.NODE_ENV = "production";
    const { controller, auth } = makeSut({
      registrationEnabled: true,
      allowPublicRegistrationInHardenedEnv: true,
    });

    await controller.register(
      { email: "new@example.com", password: "password123", name: "New User" },
      makeReq(),
      makeRes(),
    );

    expect(auth.register).toHaveBeenCalled();
  });
});
