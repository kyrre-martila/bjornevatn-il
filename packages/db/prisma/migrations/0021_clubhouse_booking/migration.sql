-- CreateEnum
CREATE TYPE "ClubhouseBookingStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateTable
CREATE TABLE "ClubhouseBooking" (
    "id" TEXT NOT NULL,
    "bookedByName" TEXT NOT NULL,
    "bookedByEmail" TEXT NOT NULL,
    "bookedByPhone" TEXT NOT NULL,
    "organization" TEXT,
    "purpose" TEXT NOT NULL,
    "attendeeCount" INTEGER,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "ClubhouseBookingStatus" NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubhouseBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubhouseBlockedPeriod" (
    "id" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubhouseBlockedPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubhouseBooking_startAt_endAt_idx" ON "ClubhouseBooking"("startAt", "endAt");

-- CreateIndex
CREATE INDEX "ClubhouseBooking_status_startAt_endAt_idx" ON "ClubhouseBooking"("status", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ClubhouseBlockedPeriod_startAt_endAt_idx" ON "ClubhouseBlockedPeriod"("startAt", "endAt");
