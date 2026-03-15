jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import {
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

  function makeSut(role = "admin") {
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
      resetFromLive: jest.fn(),
      pushToLive: jest.fn(),
      deleteStaging: jest.fn(),
    } as any;

    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as any;

    const controller = new StagingController(authService, stagingService, config);

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
});
