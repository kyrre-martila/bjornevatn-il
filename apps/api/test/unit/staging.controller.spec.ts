jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { StagingController } from "../../src/modules/staging/staging.controller";

describe("StagingController", () => {
  function makeRequest(token?: string): Request {
    return {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      cookies: token ? { access: token } : {},
    } as unknown as Request;
  }

  function makeSut(role = "admin", confirmationToken?: string) {
    const authService = {
      validateUser: jest.fn().mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        role,
      }),
    } as any;

    const stagingService = {
      getStatus: jest.fn().mockResolvedValue({ environment: "staging" }),
      resetFromLive: jest.fn().mockResolvedValue({ ok: true }),
      pushToLive: jest.fn().mockResolvedValue({ ok: true }),
      deleteStaging: jest.fn().mockResolvedValue({ ok: true }),
    } as any;

    const config = {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key === "STAGING_PUSH_CONFIRMATION_TOKEN"
            ? confirmationToken
            : undefined,
        ),
    } as any;

    const controller = new StagingController(
      authService,
      stagingService,
      config,
    );

    return { controller, authService, stagingService };
  }

  it("requires authentication for status", async () => {
    const { controller } = makeSut();

    await expect(controller.getStatus(makeRequest())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("forbids editor role from status", async () => {
    const { controller } = makeSut("editor");

    await expect(
      controller.getStatus(makeRequest("editor-token")),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows admin role to read status", async () => {
    const { controller, stagingService } = makeSut("admin");

    await expect(
      controller.getStatus(makeRequest("admin-token")),
    ).resolves.toEqual({ environment: "staging" });

    expect(stagingService.getStatus).toHaveBeenCalledWith({
      userId: "user-1",
      email: "user@example.com",
      name: "User",
    });
  });

  it("forbids admin role from reset/push/delete", async () => {
    const { controller } = makeSut("admin");

    await expect(
      controller.resetFromLive(makeRequest("admin-token")),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      controller.pushToLive(makeRequest("admin-token"), {
        confirmPushToLive: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      controller.deleteStaging(makeRequest("admin-token")),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows superadmin to run reset/push/delete", async () => {
    const { controller, stagingService } = makeSut("superadmin");

    await expect(
      controller.resetFromLive(makeRequest("superadmin-token")),
    ).resolves.toEqual({ ok: true });

    await expect(
      controller.pushToLive(makeRequest("superadmin-token"), {
        confirmPushToLive: true,
      }),
    ).resolves.toEqual({ ok: true });

    await expect(
      controller.deleteStaging(makeRequest("superadmin-token")),
    ).resolves.toEqual({ ok: true });

    expect(stagingService.resetFromLive).toHaveBeenCalledTimes(1);
    expect(stagingService.pushToLive).toHaveBeenCalledTimes(1);
    expect(stagingService.deleteStaging).toHaveBeenCalledTimes(1);
  });

  it("requires explicit push confirmation", async () => {
    const { controller } = makeSut("superadmin");

    await expect(
      controller.pushToLive(makeRequest("superadmin-token"), {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires matching push confirmation token when configured", async () => {
    const { controller } = makeSut("superadmin", "expected-token");

    await expect(
      controller.pushToLive(makeRequest("superadmin-token"), {
        confirmPushToLive: true,
        confirmationToken: "wrong-token",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.pushToLive(makeRequest("superadmin-token"), {
        confirmPushToLive: true,
        confirmationToken: "expected-token",
      }),
    ).resolves.toEqual({ ok: true });
  });
});
