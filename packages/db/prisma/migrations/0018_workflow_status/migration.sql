CREATE TYPE "WorkflowStatus" AS ENUM ('draft', 'in_review', 'approved', 'published', 'archived');

ALTER TABLE "Page"
  ADD COLUMN "workflowStatus" "WorkflowStatus" NOT NULL DEFAULT 'draft';

ALTER TABLE "ContentItem"
  ADD COLUMN "workflowStatus" "WorkflowStatus" NOT NULL DEFAULT 'draft';

UPDATE "Page"
SET "workflowStatus" = CASE WHEN "published" = true THEN 'published'::"WorkflowStatus" ELSE 'draft'::"WorkflowStatus" END;

UPDATE "ContentItem"
SET "workflowStatus" = CASE WHEN "published" = true THEN 'published'::"WorkflowStatus" ELSE 'draft'::"WorkflowStatus" END;
