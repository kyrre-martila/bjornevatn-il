-- Admin query and pagination index hardening
CREATE INDEX IF NOT EXISTS "ContentItem_contentTypeId_published_createdAt_idx"
  ON "ContentItem"("contentTypeId", "published", "createdAt");

CREATE INDEX IF NOT EXISTS "Ticket_ticketSaleId_status_idx"
  ON "Ticket"("ticketSaleId", "status");

CREATE INDEX IF NOT EXISTS "Ticket_orderReference_createdAt_idx"
  ON "Ticket"("orderReference", "createdAt");

CREATE INDEX IF NOT EXISTS "Media_createdAt_idx"
  ON "Media"("createdAt");

CREATE INDEX IF NOT EXISTS "Media_mimeType_createdAt_idx"
  ON "Media"("mimeType", "createdAt");

CREATE INDEX IF NOT EXISTS "Media_fileName_idx"
  ON "Media"("fileName");
