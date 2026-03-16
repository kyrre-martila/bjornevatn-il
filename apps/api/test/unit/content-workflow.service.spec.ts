import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ContentWorkflowService } from "../../src/modules/content/content-workflow.service";

describe("ContentWorkflowService", () => {
  const service = new ContentWorkflowService();

  it("resolves requested published status to published", () => {
    expect(
      service.resolveWorkflowUpdate("admin", "draft", false, undefined, true),
    ).toEqual({ workflowStatus: "published", published: true });
  });

  it("blocks editor from setting approved status", () => {
    expect(() =>
      service.resolveWorkflowUpdate(
        "editor",
        "draft",
        false,
        "approved",
        undefined,
      ),
    ).toThrow(
      new ForbiddenException(
        "Access denied: editors can only save draft or submit for review.",
      ),
    );
  });

  it("normalizes and validates publishing windows", () => {
    const result = service.normalizePublishingWindow({
      publishAt: "2025-01-01T00:00:00.000Z",
      unpublishAt: "2025-01-02T00:00:00.000Z",
    });

    expect(result.publishAt).toBeInstanceOf(Date);
    expect(result.unpublishAt).toBeInstanceOf(Date);
  });

  it("rejects inverted publish windows", () => {
    expect(() =>
      service.normalizePublishingWindow({
        publishAt: "2025-01-02T00:00:00.000Z",
        unpublishAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toThrow(new BadRequestException("unpublishAt must be after publishAt."));
  });
});
