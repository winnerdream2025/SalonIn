-- Create Platform enum if it does not exist yet
DO $$ BEGIN
  CREATE TYPE "Platform" AS ENUM ('IOS', 'ANDROID');
EXCEPTION WHEN duplicate_object THEN null;
END; $$;

-- Create UserDevice table if it does not exist yet
CREATE TABLE IF NOT EXISTS "UserDevice" (
    "id"            TEXT        NOT NULL,
    "userId"        TEXT        NOT NULL,
    "expoPushToken" TEXT        NOT NULL,
    "platform"      "Platform"  NOT NULL,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- Add FK to User (safe to run multiple times)
DO $$ BEGIN
  ALTER TABLE "UserDevice"
    ADD CONSTRAINT "UserDevice_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END; $$;

-- Drop old single-device unique index if it exists (from previous db push)
DROP INDEX IF EXISTS "UserDevice_userId_key";

-- Add composite unique on (userId, expoPushToken) — prevents duplicate token registrations
DO $$ BEGIN
  ALTER TABLE "UserDevice"
    ADD CONSTRAINT "UserDevice_userId_expoPushToken_key"
    UNIQUE ("userId", "expoPushToken");
EXCEPTION WHEN duplicate_object THEN null;
END; $$;
