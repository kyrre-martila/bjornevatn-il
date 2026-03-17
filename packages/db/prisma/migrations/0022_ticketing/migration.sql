-- CreateEnum
CREATE TYPE "TicketSaleStatus" AS ENUM ('draft', 'active', 'sold_out', 'closed');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('reserved', 'confirmed', 'cancelled', 'used');

-- CreateTable
CREATE TABLE "TicketSale" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ticketTypes" JSONB NOT NULL,
    "saleStartAt" TIMESTAMP(3) NOT NULL,
    "saleEndAt" TIMESTAMP(3) NOT NULL,
    "maxTickets" INTEGER NOT NULL,
    "status" "TicketSaleStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketSaleId" TEXT NOT NULL,
    "ticketType" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'reserved',
    "orderReference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketSale_matchId_key" ON "TicketSale"("matchId");

-- CreateIndex
CREATE INDEX "TicketSale_status_saleStartAt_saleEndAt_idx" ON "TicketSale"("status", "saleStartAt", "saleEndAt");

-- CreateIndex
CREATE INDEX "Ticket_ticketSaleId_ticketType_idx" ON "Ticket"("ticketSaleId", "ticketType");

-- CreateIndex
CREATE INDEX "Ticket_orderReference_idx" ON "Ticket"("orderReference");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- AddForeignKey
ALTER TABLE "TicketSale" ADD CONSTRAINT "TicketSale_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketSaleId_fkey" FOREIGN KEY ("ticketSaleId") REFERENCES "TicketSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
