import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

export type WorkflowRole = "editor" | "admin" | "super_admin";
export type WorkflowStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

@Injectable()
export class ContentWorkflowService {
  private parseScheduledDate(
    value: string | null | undefined,
    fieldName: "publishAt" | "unpublishAt",
  ): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date/time.`);
    }

    return parsed;
  }

  normalizePublishingWindow<
    T extends { publishAt?: string | null; unpublishAt?: string | null },
  >(
    body: T,
    current?: { publishAt: Date | null; unpublishAt: Date | null },
  ): T & { publishAt?: Date | null; unpublishAt?: Date | null } {
    const publishAt = this.parseScheduledDate(body.publishAt, "publishAt");
    const unpublishAt = this.parseScheduledDate(
      body.unpublishAt,
      "unpublishAt",
    );

    const effectivePublishAt =
      publishAt === undefined ? current?.publishAt : publishAt;
    const effectiveUnpublishAt =
      unpublishAt === undefined ? current?.unpublishAt : unpublishAt;

    if (
      effectivePublishAt &&
      effectiveUnpublishAt &&
      effectiveUnpublishAt <= effectivePublishAt
    ) {
      throw new BadRequestException("unpublishAt must be after publishAt.");
    }

    return {
      ...body,
      ...(publishAt === undefined ? {} : { publishAt }),
      ...(unpublishAt === undefined ? {} : { unpublishAt }),
    };
  }

  resolveWorkflowUpdate(
    role: WorkflowRole,
    currentStatus: WorkflowStatus | undefined,
    currentPublished: boolean | undefined,
    requestedStatus: WorkflowStatus | undefined,
    requestedPublished: boolean | undefined,
  ): { workflowStatus: WorkflowStatus; published: boolean } {
    const baseStatus =
      currentStatus ?? (currentPublished ? "published" : "draft");
    const nextStatus =
      requestedStatus ??
      (requestedPublished === undefined
        ? baseStatus
        : requestedPublished
          ? "published"
          : "draft");

    if (
      role === "editor" &&
      nextStatus !== "draft" &&
      nextStatus !== "in_review"
    ) {
      throw new ForbiddenException(
        "Access denied: editors can only save draft or submit for review.",
      );
    }

    return {
      workflowStatus: nextStatus,
      published: nextStatus === "published",
    };
  }
}
