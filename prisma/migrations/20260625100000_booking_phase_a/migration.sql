-- Phase A: Native booking system extensions
-- Task 2: AvailabilityException model
CREATE TABLE "AvailabilityException" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AvailabilityException_providerId_providerType_date_idx" ON "AvailabilityException"("providerId", "providerType", "date");

-- Task 5: Extend ProviderService
ALTER TABLE "ProviderService" ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION;
ALTER TABLE "ProviderService" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ProviderService" ADD COLUMN IF NOT EXISTS "bufferBefore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProviderService" ADD COLUMN IF NOT EXISTS "bufferAfter" INTEGER NOT NULL DEFAULT 0;

-- Task 6: Extend Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "depositPaid" BOOLEAN NOT NULL DEFAULT false;

-- Task 7: Booking policy fields on WorkerProfile
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "instantBooking" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "requiresDeposit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "cancellationWindowHours" INTEGER;
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "rescheduleWindowHours" INTEGER;
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "lateFeeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "lateFeeAmount" DOUBLE PRECISION;

-- Task 7: Booking policy fields on SalonProfile
ALTER TABLE "SalonProfile" ADD COLUMN IF NOT EXISTS "instantBooking" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SalonProfile" ADD COLUMN IF NOT EXISTS "requiresDeposit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SalonProfile" ADD COLUMN IF NOT EXISTS "cancellationWindowHours" INTEGER;
ALTER TABLE "SalonProfile" ADD COLUMN IF NOT EXISTS "rescheduleWindowHours" INTEGER;
ALTER TABLE "SalonProfile" ADD COLUMN IF NOT EXISTS "lateFeeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SalonProfile" ADD COLUMN IF NOT EXISTS "lateFeeAmount" DOUBLE PRECISION;
