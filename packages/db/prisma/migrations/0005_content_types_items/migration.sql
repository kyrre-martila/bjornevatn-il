-- CreateTable
CREATE TABLE "ContentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "contentTypeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentType_slug_key" ON "ContentType"("slug");
CREATE INDEX "ContentType_slug_idx" ON "ContentType"("slug");
CREATE UNIQUE INDEX "ContentItem_contentTypeId_slug_key" ON "ContentItem"("contentTypeId", "slug");
CREATE INDEX "ContentItem_contentTypeId_idx" ON "ContentItem"("contentTypeId");
CREATE INDEX "ContentItem_published_idx" ON "ContentItem"("published");

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_contentTypeId_fkey" FOREIGN KEY ("contentTypeId") REFERENCES "ContentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing Post rows into a default "news" content type
INSERT INTO "ContentType" ("id", "name", "slug", "description", "createdAt", "updatedAt")
VALUES ('legacy-news', 'News', 'news', 'Migrated from legacy posts.', NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ContentItem" ("id", "contentTypeId", "slug", "title", "data", "published", "createdAt", "updatedAt")
SELECT
  p."id",
  ct."id",
  p."slug",
  p."title",
  jsonb_build_object(
    'excerpt', p."excerpt",
    'content', p."content",
    'featuredImage', p."featuredImage",
    'publishedAt', p."publishedAt"
  ),
  CASE WHEN p."publishedAt" IS NULL THEN false ELSE true END,
  p."createdAt",
  COALESCE(p."publishedAt", p."createdAt")
FROM "Post" p
JOIN "ContentType" ct ON ct."slug" = 'news';

-- Drop legacy Post table
DROP TABLE "Post";
