-- Create taxonomy structures
CREATE TABLE "Taxonomy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Taxonomy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "taxonomyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentItemTerm" (
    "contentItemId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    CONSTRAINT "ContentItemTerm_pkey" PRIMARY KEY ("contentItemId","termId")
);

CREATE UNIQUE INDEX "Taxonomy_slug_key" ON "Taxonomy"("slug");
CREATE INDEX "Taxonomy_slug_idx" ON "Taxonomy"("slug");
CREATE UNIQUE INDEX "Term_taxonomyId_slug_key" ON "Term"("taxonomyId", "slug");
CREATE INDEX "Term_taxonomyId_idx" ON "Term"("taxonomyId");
CREATE INDEX "Term_parentId_idx" ON "Term"("parentId");
CREATE INDEX "ContentItemTerm_termId_idx" ON "ContentItemTerm"("termId");

ALTER TABLE "Term" ADD CONSTRAINT "Term_taxonomyId_fkey" FOREIGN KEY ("taxonomyId") REFERENCES "Taxonomy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Term" ADD CONSTRAINT "Term_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentItemTerm" ADD CONSTRAINT "ContentItemTerm_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentItemTerm" ADD CONSTRAINT "ContentItemTerm_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;
