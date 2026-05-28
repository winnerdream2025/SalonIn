-- Allow multiple devices per user (iPhone + iPad scenario)
-- Drop single-device unique index on userId
DROP INDEX "UserDevice_userId_key";

-- Add composite unique on (userId, expoPushToken) — prevents duplicate token registrations
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_expoPushToken_key" UNIQUE ("userId", "expoPushToken");
