ALTER TABLE "Media"
  RENAME COLUMN "alt" TO "altText";

ALTER TABLE "Media"
  RENAME COLUMN "sizeBytes" TO "fileSize";

ALTER TABLE "Media"
  RENAME COLUMN "originalFilename" TO "originalName";

ALTER TABLE "Media"
  ADD COLUMN "fileName" TEXT,
  ADD COLUMN "caption" TEXT,
  ADD COLUMN "uploadedBy" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Media"
SET "fileName" = COALESCE(NULLIF(regexp_replace(split_part("url", '/', array_length(string_to_array("url", '/'), 1)), '\\?.*$', ''), ''), "originalName", "id");

ALTER TABLE "Media"
  ALTER COLUMN "fileName" SET NOT NULL;
