jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { BadRequestException, ConflictException } from "@nestjs/common";
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


describe("ContentController createContentItem validation batching", () => {
  function makeSut() {
    const pages = {
      findManyByIds: jest.fn().mockResolvedValue([{ id: "page-1" }]),
      findById: jest.fn(),
    } as unknown as jest.Mocked<PagesRepository>;

    const contentTypes = {
      findById: jest.fn().mockResolvedValue({
        id: "type-post",
        slug: "post",
        name: "Post",
        description: "",
        fields: [
          {
            key: "relatedPosts",
            type: "contentItem",
            required: false,
            relation: { targetType: "contentType", targetSlug: "post", multiple: true },
          },
          {
            key: "heroMedia",
            type: "media",
            required: false,
            relation: { targetType: "media" },
          },
          {
            key: "landingPage",
            type: "page",
            required: false,
            relation: { targetType: "page" },
          },
        ],
      }),
      findManyBySlugs: jest.fn().mockResolvedValue([
        {
          id: "type-post",
          slug: "post",
          name: "Post",
          description: "",
          fields: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          templateKey: null,
          isPublic: true,
        },
      ]),
    } as unknown as jest.Mocked<ContentTypesRepository>;

    const contentItems = {
      countByContentTypeId: jest.fn(),
      findManyByIds: jest
        .fn()
        .mockResolvedValue([{ id: "item-1", contentTypeId: "type-post" }]),
      findById: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: "created-item" }),
    } as unknown as jest.Mocked<ContentItemsRepository>;

    const navigation = {} as NavigationItemsRepository;
    const settings = {} as SiteSettingsRepository;

    const media = {
      findMany: jest.fn().mockResolvedValue([]),
      findManyByIds: jest
        .fn()
        .mockResolvedValue([{ id: "media-1", alt: "Descriptive alt text" }]),
      findById: jest.fn(),
    } as unknown as jest.Mocked<MediaRepository>;

    const auth = {
      validateUser: jest.fn().mockResolvedValue({
        id: "editor-1",
        role: "superadmin",
      }),
    } as unknown as jest.Mocked<AuthService>;

    const audit = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    const mediaService = {} as MediaService;
    const mediaUsageService = {
      isMediaUrlUsed: jest.fn(),
      getUsedUrls: jest.fn(),
    } as unknown as jest.Mocked<MediaUsageService>;

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

    return { controller, pages, contentTypes, contentItems, media };
  }

  it("uses batched repository lookups for relation validation", async () => {
    const { controller, pages, contentTypes, contentItems, media } = makeSut();

    await controller.createContentItem(makeRequest(), {
      contentTypeId: "type-post",
      slug: "new-item",
      title: "New item",
      data: {
        relatedPosts: ["item-1"],
        heroMedia: "media-1",
        landingPage: "page-1",
      },
      published: false,
    });

    expect(contentTypes.findManyBySlugs).toHaveBeenCalledWith(["post"]);
    expect(pages.findManyByIds).toHaveBeenCalledWith(["page-1"]);
    expect(media.findManyByIds).toHaveBeenCalledWith(["media-1"]);
    expect(contentItems.findManyByIds).toHaveBeenCalledWith(["item-1"]);
    expect(pages.findById).not.toHaveBeenCalled();
    expect(media.findById).not.toHaveBeenCalled();
    expect(contentItems.findById).not.toHaveBeenCalled();
  });

  it("keeps validation behavior for unknown relation content types", async () => {
    const { controller, contentTypes } = makeSut();
    contentTypes.findManyBySlugs = jest.fn().mockResolvedValue([]);

    await expect(
      controller.createContentItem(makeRequest(), {
        contentTypeId: "type-post",
        slug: "new-item",
        title: "New item",
        data: {
          relatedPosts: ["item-1"],
        },
        published: false,
      }),
    ).rejects.toEqual(
      new BadRequestException(
        "Field relatedPosts references unknown content type slug: post.",
      ),
    );
  });
});
