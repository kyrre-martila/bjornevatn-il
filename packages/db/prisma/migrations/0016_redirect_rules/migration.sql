CREATE TABLE "RedirectRule" (
  "id" TEXT NOT NULL,
  "fromPath" TEXT NOT NULL,
  "toPath" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RedirectRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RedirectRule_fromPath_key" ON "RedirectRule"("fromPath");
CREATE INDEX "RedirectRule_fromPath_idx" ON "RedirectRule"("fromPath");
