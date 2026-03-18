CREATE TYPE "OperationalEventSeverity" AS ENUM ('info', 'warn', 'error');

CREATE TABLE "OperationalEvent" (
    "id" TEXT NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "severity" "OperationalEventSeverity" NOT NULL DEFAULT 'info',
    "actorId" VARCHAR(255),
    "actorRole" VARCHAR(64),
    "actorType" VARCHAR(64),
    "requestId" VARCHAR(255),
    "route" VARCHAR(255),
    "module" VARCHAR(100),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchSyncRun" (
    "id" TEXT NOT NULL,
    "provider" "MatchSyncSourceType" NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "failureReason" VARCHAR(500),
    "triggeredByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperationalEvent_createdAt_idx" ON "OperationalEvent"("createdAt");
CREATE INDEX "OperationalEvent_eventType_createdAt_idx" ON "OperationalEvent"("eventType", "createdAt");
CREATE INDEX "OperationalEvent_severity_createdAt_idx" ON "OperationalEvent"("severity", "createdAt");
CREATE INDEX "OperationalEvent_module_createdAt_idx" ON "OperationalEvent"("module", "createdAt");

CREATE INDEX "MatchSyncRun_provider_startedAt_idx" ON "MatchSyncRun"("provider", "startedAt");
CREATE INDEX "MatchSyncRun_status_startedAt_idx" ON "MatchSyncRun"("status", "startedAt");
CREATE INDEX "MatchSyncRun_triggeredByUserId_idx" ON "MatchSyncRun"("triggeredByUserId");
