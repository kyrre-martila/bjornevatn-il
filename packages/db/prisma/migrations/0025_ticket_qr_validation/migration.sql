-- CreateEnum
CREATE TYPE "TicketValidationStatus" AS ENUM ('valid', 'used', 'cancelled', 'revoked');

-- CreateEnum
CREATE TYPE "TicketScanAction" AS ENUM ('validate', 'confirm_entry', 'override_entry');

-- CreateEnum
CREATE TYPE "TicketScanResult" AS ENUM ('success', 'already_used', 'cancelled', 'revoked', 'not_found', 'invalid');

-- AlterTable
ALTER TABLE "Ticket"
  ADD COLUMN "qrCodeValue" TEXT,
  ADD COLUMN "qrIssuedAt" TIMESTAMP(3),
  ADD COLUMN "scanCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "firstScannedAt" TIMESTAMP(3),
  ADD COLUMN "lastScannedAt" TIMESTAMP(3),
  ADD COLUMN "lastScannedBy" TEXT,
  ADD COLUMN "validationStatus" "TicketValidationStatus" NOT NULL DEFAULT 'valid',
  ADD COLUMN "isRevoked" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Ticket"
SET
  "qrCodeValue" = 'legacy:' || "id",
  "qrIssuedAt" = "createdAt",
  "validationStatus" = CASE
    WHEN "status" = 'used' THEN 'used'::"TicketValidationStatus"
    WHEN "status" = 'cancelled' THEN 'cancelled'::"TicketValidationStatus"
    ELSE 'valid'::"TicketValidationStatus"
  END;

ALTER TABLE "Ticket"
  ALTER COLUMN "qrCodeValue" SET NOT NULL,
  ALTER COLUMN "qrIssuedAt" SET NOT NULL;

-- CreateTable
CREATE TABLE "TicketScanLog" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT,
  "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scannedBy" TEXT,
  "action" "TicketScanAction" NOT NULL,
  "result" "TicketScanResult" NOT NULL,
  "notes" TEXT,

  CONSTRAINT "TicketScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_qrCodeValue_key" ON "Ticket"("qrCodeValue");

-- CreateIndex
CREATE INDEX "Ticket_validationStatus_idx" ON "Ticket"("validationStatus");

-- CreateIndex
CREATE INDEX "TicketScanLog_ticketId_scannedAt_idx" ON "TicketScanLog"("ticketId", "scannedAt");

-- CreateIndex
CREATE INDEX "TicketScanLog_scannedAt_idx" ON "TicketScanLog"("scannedAt");

-- AddForeignKey
ALTER TABLE "TicketScanLog" ADD CONSTRAINT "TicketScanLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
