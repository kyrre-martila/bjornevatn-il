CREATE TYPE "MatchSyncSourceType" AS ENUM ('fotball_no', 'ical');
CREATE TYPE "MatchSyncImportMode" AS ENUM ('create_only', 'create_and_update');

CREATE TABLE "FotballNoSettings" (
    "id" TEXT NOT NULL DEFAULT 'fotball-no-settings',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "clubName" TEXT,
    "clubId" TEXT,
    "teamIds" JSONB,
    "sourceType" "MatchSyncSourceType" NOT NULL DEFAULT 'ical',
    "importMode" "MatchSyncImportMode" NOT NULL DEFAULT 'create_and_update',
    "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FotballNoSettings_pkey" PRIMARY KEY ("id")
);
