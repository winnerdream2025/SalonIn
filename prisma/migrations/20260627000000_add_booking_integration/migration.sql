-- ─── AccountType enum ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "AccountType" AS ENUM ('CLIENT', 'PROFESSIONAL', 'SALON');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── User: accountType + bookingProfileId ─────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "accountType" "AccountType",
  ADD COLUMN IF NOT EXISTS "bookingProfileId" TEXT;

-- ─── WorkerProfile: booking capability fields ─────────────────────────────────
ALTER TABLE "WorkerProfile"
  ADD COLUMN IF NOT EXISTS "acceptsBookings"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "homeServiceEnabled"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "travelServiceEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "travelRadius"         INTEGER,
  ADD COLUMN IF NOT EXISTS "travelFee"            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "availabilityEnabled"  BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "WorkerProfile_acceptsBookings_idx"
  ON "WorkerProfile"("acceptsBookings");

-- ─── SalonProfile: booking capability fields ──────────────────────────────────
ALTER TABLE "SalonProfile"
  ADD COLUMN IF NOT EXISTS "acceptsBookings"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bookingProfileId" TEXT;

-- ─── NotificationType: booking values ─────────────────────────────────────────
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_RESCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STORY_REPLY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'STORY_LIKE';

-- ─── ProviderBookingProfile table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProviderBookingProfile" (
  "id"                      TEXT NOT NULL,
  "providerId"              TEXT NOT NULL,
  "providerType"            TEXT NOT NULL,
  "tenantSlug"              TEXT NOT NULL,
  "externalBookingSystemId" TEXT,
  "isActive"                BOOLEAN NOT NULL DEFAULT true,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProviderBookingProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProviderBookingProfile_providerId_providerType_key"
  ON "ProviderBookingProfile"("providerId", "providerType");

CREATE INDEX IF NOT EXISTS "ProviderBookingProfile_tenantSlug_idx"
  ON "ProviderBookingProfile"("tenantSlug");
