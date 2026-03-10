CREATE TABLE "PageSlugRedirect" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "sourceSlug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PageSlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageSlugRedirect_sourceSlug_key" ON "PageSlugRedirect"("sourceSlug");
CREATE INDEX "PageSlugRedirect_pageId_idx" ON "PageSlugRedirect"("pageId");

ALTER TABLE "PageSlugRedirect"
ADD CONSTRAINT "PageSlugRedirect_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ContentItemSlugRedirect" (
  "id" TEXT NOT NULL,
  "contentItemId" TEXT NOT NULL,
  "contentTypeId" TEXT NOT NULL,
  "sourceSlug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContentItemSlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentItemSlugRedirect_contentTypeId_sourceSlug_key"
ON "ContentItemSlugRedirect"("contentTypeId", "sourceSlug");
CREATE INDEX "ContentItemSlugRedirect_contentItemId_idx" ON "ContentItemSlugRedirect"("contentItemId");

ALTER TABLE "ContentItemSlugRedirect"
ADD CONSTRAINT "ContentItemSlugRedirect_contentItemId_fkey"
FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentItemSlugRedirect"
ADD CONSTRAINT "ContentItemSlugRedirect_contentTypeId_fkey"
FOREIGN KEY ("contentTypeId") REFERENCES "ContentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
