-- AlterEnum: add TEXT to MediaType
ALTER TYPE "MediaType" ADD VALUE 'TEXT';

-- CreateEnum: StoryVisibility
CREATE TYPE "StoryVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');

-- AlterEnum: add NEW_STORY to NotificationType
ALTER TYPE "NotificationType" ADD VALUE 'NEW_STORY';

-- AlterTable: make mediaUrl nullable and add new fields
ALTER TABLE "Story"
  ALTER COLUMN "mediaUrl" DROP NOT NULL,
  ADD COLUMN "textContent"    TEXT,
  ADD COLUMN "textBgColor"    TEXT,
  ADD COLUMN "visibility"     "StoryVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "location"       TEXT,
  ADD COLUMN "mentions"       TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "updatedAt"      TIMESTAMP(3);
