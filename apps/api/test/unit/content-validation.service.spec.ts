import { ForbiddenException } from "@nestjs/common";
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
});
