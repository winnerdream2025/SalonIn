-- Add status, type and delivery tracking to Message
ALTER TABLE "Message" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE "Message" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'sent';
ALTER TABLE "Message" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "readAt" TIMESTAMP(3);

-- Migrate old read receipts into the new status model
UPDATE "Message" SET "status" = 'read', "readAt" = "createdAt" WHERE "isRead" = true;
UPDATE "Message" SET "type" = 'MEDIA' WHERE "mediaUrl" IS NOT NULL;

-- Constrain status values to the allowed delivery states
ALTER TABLE "Message" ADD CONSTRAINT "Message_status_check" CHECK ("status" IN ('sent', 'delivered', 'read', 'failed'));

-- Indexes for efficient status-based queries
CREATE INDEX "Message_conversationId_status_idx" ON "Message"("conversationId", "status");
CREATE INDEX "Message_senderId_status_idx" ON "Message"("senderId", "status");
