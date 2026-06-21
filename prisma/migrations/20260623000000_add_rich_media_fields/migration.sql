-- AlterTable: add rich media fields to Message
ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "mediaUrls"    JSONB,
  ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "fileName"     TEXT,
  ADD COLUMN IF NOT EXISTS "fileSize"     INTEGER,
  ADD COLUMN IF NOT EXISTS "mimeType"     TEXT,
  ADD COLUMN IF NOT EXISTS "contactName"  TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude"    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "locationName" TEXT;
