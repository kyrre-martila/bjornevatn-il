import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ContentValidationService } from "../../src/modules/content/content-validation.service";

describe("ContentValidationService", () => {
  function makeService() {
    const pages = { findManyByIds: jest.fn().mockResolvedValue([]) };
    const contentTypes = { findManyBySlugs: jest.fn().mockResolvedValue([]) };
    const contentItems = { findManyByIds: jest.fn().mockResolvedValue([]) };
    const media = {
      findManyByIds: jest.fn().mockResolvedValue([]),
      findManyByUrls: jest.fn().mockResolvedValue([]),
    };

    return new ContentValidationService(
      pages as never,
      contentTypes as never,
      contentItems as never,
      media as never,
    );
  }

  it("blocks editors from modifying relation-backed fields", () => {
    const service = makeService();

    expect(() =>
      service.ensureEditorCannotModifyRelationFields(
        "editor",
        [
          {
            key: "relatedPost",
            type: "contentItem",
            required: false,
            relation: { targetType: "contentType", targetSlug: "post" },
          },
        ] as never,
        { relatedPost: "item-2" },
        { relatedPost: "item-1" },
      ),
    ).toThrow(
      new ForbiddenException(
        "Access denied: editors cannot modify relation fields.",
      ),
    );
  });

  it("validates allowed news categories", async () => {
    const service = makeService();

    await expect(
      service.validateContentItemData(
        [{ key: "category", type: "text", required: true }] as never,
        { category: "invalid" },
        "news",
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("enforces unique optional match externalId when present", async () => {
    const pages = { findManyByIds: jest.fn().mockResolvedValue([]) };
    const contentTypes = { findManyBySlugs: jest.fn().mockResolvedValue([]) };
    const contentItems = {
      findManyByIds: jest.fn().mockResolvedValue([]),
      findManyByContentTypeSlug: jest.fn().mockResolvedValue([
        {
          id: "existing-match",
          contentTypeId: "ct-match",
          data: { externalId: "import-123" },
        },
      ]),
    };
    const media = {
      findManyByIds: jest.fn().mockResolvedValue([]),
      findManyByUrls: jest.fn().mockResolvedValue([]),
    };

    const service = new ContentValidationService(
      pages as never,
      contentTypes as never,
      contentItems as never,
      media as never,
    );

    await expect(
      service.validateContentItemData(
        [{ key: "externalId", type: "text", required: false }] as never,
        { externalId: "import-123" },
        "match",
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
