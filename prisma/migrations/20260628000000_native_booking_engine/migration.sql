-- Native Booking Engine migration
-- AddS BookingStatus enum, ProviderService, ProviderAvailabilityRule, Booking, BookingPayment
-- Also adds Stripe Connect fields to WorkerProfile and SalonProfile

CREATE TYPE "BookingStatus" AS ENUM (
  'PENDING_PAYMENT',
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW'
);

-- Stripe Connect fields
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "stripeConnectEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SalonProfile"  ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
ALTER TABLE "SalonProfile"  ADD COLUMN IF NOT EXISTS "stripeConnectEnabled" BOOLEAN NOT NULL DEFAULT false;

-- ProviderService
CREATE TABLE "ProviderService" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "providerId"   TEXT NOT NULL,
  "providerType" TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "duration"     INTEGER NOT NULL,
  "price"        DOUBLE PRECISION NOT NULL,
  "currency"     TEXT NOT NULL DEFAULT 'USD',
  "category"     TEXT,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderService_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProviderService_providerId_providerType_isActive_idx"
  ON "ProviderService"("providerId", "providerType", "isActive");

-- ProviderAvailabilityRule
CREATE TABLE "ProviderAvailabilityRule" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "providerId"   TEXT NOT NULL,
  "providerType" TEXT NOT NULL,
  "dayOfWeek"    INTEGER NOT NULL,
  "isOpen"       BOOLEAN NOT NULL DEFAULT true,
  "openTime"     TEXT NOT NULL,
  "closeTime"    TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderAvailabilityRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProviderAvailabilityRule_providerId_providerType_dayOfWeek_key"
  ON "ProviderAvailabilityRule"("providerId", "providerType", "dayOfWeek");
CREATE INDEX "ProviderAvailabilityRule_providerId_providerType_idx"
  ON "ProviderAvailabilityRule"("providerId", "providerType");

-- Booking
CREATE TABLE "Booking" (
  "id"                   TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "providerId"           TEXT NOT NULL,
  "providerType"         TEXT NOT NULL,
  "serviceId"            TEXT NOT NULL,
  "clientUserId"         TEXT,
  "clientName"           TEXT NOT NULL,
  "clientEmail"          TEXT NOT NULL,
  "clientPhone"          TEXT,
  "date"                 TEXT NOT NULL,
  "startTime"            TEXT NOT NULL,
  "endTime"              TEXT NOT NULL,
  "status"               "BookingStatus" NOT NULL DEFAULT 'PENDING',
  "price"                DOUBLE PRECISION NOT NULL,
  "currency"             TEXT NOT NULL DEFAULT 'USD',
  "notes"                TEXT,
  "cancelToken"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "rescheduleToken"      TEXT DEFAULT gen_random_uuid()::text,
  "cancelTokenExpiresAt" TIMESTAMP(3),
  "confirmationCode"     TEXT,
  "cancelReason"         TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId")
    REFERENCES "ProviderService"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Booking_cancelToken_key"         ON "Booking"("cancelToken");
CREATE UNIQUE INDEX "Booking_rescheduleToken_key"     ON "Booking"("rescheduleToken") WHERE "rescheduleToken" IS NOT NULL;
CREATE UNIQUE INDEX "Booking_confirmationCode_key"    ON "Booking"("confirmationCode") WHERE "confirmationCode" IS NOT NULL;
CREATE UNIQUE INDEX "Booking_slot_unique"             ON "Booking"("providerId", "providerType", "date", "startTime");
CREATE INDEX "Booking_providerId_providerType_date_idx" ON "Booking"("providerId", "providerType", "date");
CREATE INDEX "Booking_clientEmail_status_idx"         ON "Booking"("clientEmail", "status");
CREATE INDEX "Booking_clientUserId_status_idx"        ON "Booking"("clientUserId", "status");
CREATE INDEX "Booking_cancelToken_idx"                ON "Booking"("cancelToken");
CREATE INDEX "Booking_status_date_idx"                ON "Booking"("status", "date");

-- BookingPayment
CREATE TABLE "BookingPayment" (
  "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "bookingId"             TEXT NOT NULL,
  "stripePaymentIntentId" TEXT,
  "amount"                DOUBLE PRECISION NOT NULL,
  "currency"              TEXT NOT NULL DEFAULT 'USD',
  "status"                TEXT NOT NULL DEFAULT 'pending',
  "paidAt"                TIMESTAMP(3),
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingPayment_bookingId_fkey" FOREIGN KEY ("bookingId")
    REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BookingPayment_bookingId_key"             ON "BookingPayment"("bookingId");
CREATE UNIQUE INDEX "BookingPayment_stripePaymentIntentId_key" ON "BookingPayment"("stripePaymentIntentId") WHERE "stripePaymentIntentId" IS NOT NULL;
CREATE INDEX "BookingPayment_stripePaymentIntentId_idx"        ON "BookingPayment"("stripePaymentIntentId");
