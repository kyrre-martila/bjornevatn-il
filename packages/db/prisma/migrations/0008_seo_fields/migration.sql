ALTER TABLE "Page"
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "seoImage" TEXT,
ADD COLUMN "canonicalUrl" TEXT,
ADD COLUMN "noIndex" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ContentItem"
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "seoImage" TEXT,
ADD COLUMN "canonicalUrl" TEXT,
ADD COLUMN "noIndex" BOOLEAN NOT NULL DEFAULT false;
