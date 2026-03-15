ALTER TABLE "Page"
  ADD COLUMN "publishAt" TIMESTAMP(3),
  ADD COLUMN "unpublishAt" TIMESTAMP(3);

ALTER TABLE "ContentItem"
  ADD COLUMN "publishAt" TIMESTAMP(3),
  ADD COLUMN "unpublishAt" TIMESTAMP(3);

CREATE INDEX "Page_publishAt_idx" ON "Page"("publishAt");
CREATE INDEX "Page_unpublishAt_idx" ON "Page"("unpublishAt");
CREATE INDEX "ContentItem_publishAt_idx" ON "ContentItem"("publishAt");
CREATE INDEX "ContentItem_unpublishAt_idx" ON "ContentItem"("unpublishAt");
