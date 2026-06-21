-- Add advanced chat interactions: replies, reactions, edits, deletes

-- Reply chain support
ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT;
ALTER TABLE "Message" ADD COLUMN "reactions" JSONB;
ALTER TABLE "Message" ADD COLUMN "isEdited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "isDeletedForAll" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Self-referencing foreign key for replies
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL;
CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");

-- Per-user "delete for me" tracking
CREATE TABLE "DeletedMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeletedMessage_userId_messageId_key" ON "DeletedMessage"("userId", "messageId");
CREATE INDEX "DeletedMessage_userId_idx" ON "DeletedMessage"("userId");
CREATE INDEX "DeletedMessage_messageId_idx" ON "DeletedMessage"("messageId");

ALTER TABLE "DeletedMessage" ADD CONSTRAINT "DeletedMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "DeletedMessage" ADD CONSTRAINT "DeletedMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE;
