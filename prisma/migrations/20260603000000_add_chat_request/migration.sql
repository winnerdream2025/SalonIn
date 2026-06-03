-- CreateEnum
CREATE TYPE "ChatRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "ChatRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "ChatRequestStatus" NOT NULL DEFAULT 'PENDING',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatRequest_conversationId_key" ON "ChatRequest"("conversationId");

-- CreateIndex
CREATE INDEX "ChatRequest_receiverId_status_idx" ON "ChatRequest"("receiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRequest_senderId_receiverId_key" ON "ChatRequest"("senderId", "receiverId");

-- AddForeignKey
ALTER TABLE "ChatRequest" ADD CONSTRAINT "ChatRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRequest" ADD CONSTRAINT "ChatRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRequest" ADD CONSTRAINT "ChatRequest_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
