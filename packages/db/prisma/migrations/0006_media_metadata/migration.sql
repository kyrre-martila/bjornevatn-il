-- AlterTable
ALTER TABLE "Media"
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "sizeBytes" INTEGER,
ADD COLUMN "originalFilename" TEXT,
ADD COLUMN "storageKey" TEXT;
