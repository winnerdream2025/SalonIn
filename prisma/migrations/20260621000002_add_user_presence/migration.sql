-- Add online presence tracking to User
ALTER TABLE "User" ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- Index for efficient bulk reset on startup and online-user queries
CREATE INDEX "User_isOnline_idx" ON "User"("isOnline");

-- Ensure existing users are offline (presence state will be rebuilt from Redis on connect)
UPDATE "User" SET "isOnline" = false WHERE "isOnline" = true;
