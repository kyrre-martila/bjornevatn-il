jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { ConflictException } from "@nestjs/common";
import type {
  ContentItemsRepository,
  ContentTypesRepository,
  MediaRepository,
  NavigationItemsRepository,
  PagesRepository,
  SiteSettingsRepository,
} from "@org/domain";
import type { Request } from "express";

import { ContentController } from "../../src/modules/content/content.controller";
import type { AuthService } from "../../src/modules/auth/auth.service";
import type { AuditService } from "../../src/modules/audit/audit.service";
import type { MediaService } from "../../src/modules/content/media.service";
import type { MediaUsageService } from "../../src/modules/content/media-usage.service";

function makeRequest(token = "test-token"): Request {
  return {
    headers: { authorization: `Bearer ${token}` },
    cookies: {},
  } as unknown as Request;
}

describe("ContentController deleteContentType", () => {
  function makeSut(contentItemCount: number) {
    const pages = {} as PagesRepository;
    const navigation = {} as NavigationItemsRepository;
    const settings = {} as SiteSettingsRepository;
    const media = {} as MediaRepository;

    const contentTypes = {
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ContentTypesRepository>;

    const contentItems = {
      countByContentTypeId: jest.fn().mockResolvedValue(contentItemCount),
    } as unknown as jest.Mocked<ContentItemsRepository>;

    const auth = {
      validateUser: jest.fn().mockResolvedValue({
        id: "super-admin-1",
        role: "super_admin",
      }),
    } as unknown as jest.Mocked<AuthService>;

    const audit = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    const mediaService = {} as MediaService;
    const mediaUsageService = {} as MediaUsageService;

    const controller = new ContentController(
      pages,
      contentTypes,
      contentItems,
      navigation,
      settings,
      media,
      mediaService,
      mediaUsageService,
      auth,
      audit,
    );

    return { controller, contentItems, contentTypes };
  }

  it("blocks deletion when content type has 1 item", async () => {
    const { controller, contentItems, contentTypes } = makeSut(1);

    await expect(
      controller.deleteContentType(makeRequest(), "type-1"),
    ).rejects.toEqual(
      new ConflictException(
        "Cannot delete content type with existing content items (1 found).",
      ),
    );

    expect(contentItems.countByContentTypeId).toHaveBeenCalledWith("type-1");
    expect(contentTypes.delete).not.toHaveBeenCalled();
  });

  it("blocks deletion when content type has more than 50 items", async () => {
    const { controller, contentItems, contentTypes } = makeSut(51);

    await expect(
      controller.deleteContentType(makeRequest(), "type-2"),
    ).rejects.toEqual(
      new ConflictException(
        "Cannot delete content type with existing content items (51 found).",
      ),
    );

    expect(contentItems.countByContentTypeId).toHaveBeenCalledWith("type-2");
    expect(contentTypes.delete).not.toHaveBeenCalled();
  });

  it("allows deletion when content type has no items", async () => {
    const { controller, contentItems, contentTypes } = makeSut(0);

    await expect(controller.deleteContentType(makeRequest(), "type-3")).resolves.toEqual({
      ok: true,
    });

    expect(contentItems.countByContentTypeId).toHaveBeenCalledWith("type-3");
    expect(contentTypes.delete).toHaveBeenCalledWith("type-3");
  });
});
