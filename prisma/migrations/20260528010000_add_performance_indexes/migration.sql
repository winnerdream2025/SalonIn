-- Performance indexes for feed + messaging queries

-- JobPost: feed list + salon dashboard
CREATE INDEX "JobPost_cityId_isActive_expiresAt_idx" ON "JobPost"("cityId", "isActive", "expiresAt");
CREATE INDEX "JobPost_salonId_isActive_idx" ON "JobPost"("salonId", "isActive");

-- WorkerProfile: geo-filtered queries
CREATE INDEX "WorkerProfile_cityId_availability_idx" ON "WorkerProfile"("cityId", "availability");
CREATE INDEX "WorkerProfile_cityId_isVerified_idx" ON "WorkerProfile"("cityId", "isVerified");

-- Message: conversation thread + unread count
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_senderId_isRead_idx" ON "Message"("senderId", "isRead");

-- ConversationParticipant: participant lookup
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- Report: moderation dashboard
CREATE INDEX "Report_reportedId_status_idx" ON "Report"("reportedId", "status");
