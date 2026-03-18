jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { ForbiddenException } from "@nestjs/common";
import type { Request } from "express";

import { MediaController } from "../../src/modules/content/media.controller";
import type { AuthService } from "../../src/modules/auth/auth.service";
import type { MediaService } from "../../src/modules/content/media.service";
import type { MediaUsageService } from "../../src/modules/content/media-usage.service";

function makeRequest(token = "test-token"): Request {
  return {
    headers: { authorization: `Bearer ${token}` },
    cookies: {},
  } as unknown as Request;
}

describe("MediaController deleteMedia role enforcement", () => {
  function makeSut(role: "editor" | "admin" | "super_admin") {
    const mediaService = {
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MediaService>;

    const mediaUsageService = {} as MediaUsageService;

    const auth = {
      validateUser: jest.fn().mockResolvedValue({
        id: "user-1",
        role,
      }),
    } as unknown as jest.Mocked<AuthService>;

    const prisma = {} as any;
    const controller = new MediaController(mediaService, mediaUsageService, auth, prisma);

    return { controller, mediaService };
  }

  it("rejects editor from deleting media", async () => {
    const { controller, mediaService } = makeSut("editor");

    await expect(controller.deleteMedia(makeRequest(), "media-1")).rejects.toEqual(
      new ForbiddenException("Access denied: insufficient role."),
    );

    expect(mediaService.delete).not.toHaveBeenCalled();
  });

  it("allows admin deleting media", async () => {
    const { controller, mediaService } = makeSut("admin");

    await expect(controller.deleteMedia(makeRequest(), "media-2")).resolves.toEqual({
      ok: true,
    });

    expect(mediaService.delete).toHaveBeenCalledWith("media-2");
  });

  it("allows superadmin deleting media", async () => {
    const { controller, mediaService } = makeSut("super_admin");

    await expect(controller.deleteMedia(makeRequest(), "media-3")).resolves.toEqual({
      ok: true,
    });

    expect(mediaService.delete).toHaveBeenCalledWith("media-3");
  });
});
