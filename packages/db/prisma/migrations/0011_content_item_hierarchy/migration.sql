ALTER TABLE "ContentItem"
ADD COLUMN "parentId" TEXT,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "ContentItem_parentId_idx" ON "ContentItem"("parentId");
CREATE INDEX "ContentItem_contentTypeId_parentId_sortOrder_idx" ON "ContentItem"("contentTypeId", "parentId", "sortOrder");

ALTER TABLE "ContentItem"
ADD CONSTRAINT "ContentItem_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
