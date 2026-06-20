-- Location refactor: remove static cityId, add normalized location fields + JobPost geography.
-- Google APIs (Places / Reverse Geocoding) are now the source of truth for display location;
-- exact lat/lng drive all geo filtering via PostGIS.

-- 1. Drop legacy cityId-based indexes
DROP INDEX IF EXISTS "JobPost_cityId_isActive_expiresAt_idx";
DROP INDEX IF EXISTS "WorkerProfile_cityId_availability_idx";
DROP INDEX IF EXISTS "WorkerProfile_cityId_isVerified_idx";

-- 2. WorkerProfile
ALTER TABLE "WorkerProfile" DROP COLUMN IF EXISTS "cityId";
ALTER TABLE "WorkerProfile"
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "placeId" TEXT,
  ADD COLUMN IF NOT EXISTS "formattedAddress" TEXT;

-- 3. SalonProfile
ALTER TABLE "SalonProfile" DROP COLUMN IF EXISTS "cityId";
ALTER TABLE "SalonProfile"
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "placeId" TEXT,
  ADD COLUMN IF NOT EXISTS "formattedAddress" TEXT;

-- 4. JobPost
ALTER TABLE "JobPost" DROP COLUMN IF EXISTS "cityId";
ALTER TABLE "JobPost"
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "placeId" TEXT,
  ADD COLUMN IF NOT EXISTS "formattedAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326);

-- 5. Replacement indexes
CREATE INDEX IF NOT EXISTS "WorkerProfile_availability_idx" ON "WorkerProfile"("availability");
CREATE INDEX IF NOT EXISTS "WorkerProfile_isVerified_idx" ON "WorkerProfile"("isVerified");
CREATE INDEX IF NOT EXISTS "JobPost_isActive_expiresAt_idx" ON "JobPost"("isActive", "expiresAt");
CREATE INDEX IF NOT EXISTS jobs_location_idx ON "JobPost" USING GIST(location);
