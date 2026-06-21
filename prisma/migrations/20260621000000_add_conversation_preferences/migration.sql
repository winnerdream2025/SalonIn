-- Add updatedAt to Conversation for activity-based sorting
ALTER TABLE "Conversation" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add per-user conversation preferences
ALTER TABLE "ConversationParticipant" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationParticipant" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationParticipant" ADD COLUMN "isMuted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationParticipant" ADD COLUMN "pinnedAt" TIMESTAMP(3);
ALTER TABLE "ConversationParticipant" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Add indexes for efficient inbox filtering
CREATE INDEX "ConversationParticipant_userId_isArchived_idx" ON "ConversationParticipant"("userId", "isArchived");
CREATE INDEX "ConversationParticipant_userId_isPinned_pinnedAt_idx" ON "ConversationParticipant"("userId", "isPinned", "pinnedAt");
