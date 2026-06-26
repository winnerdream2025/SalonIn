-- Phase 5: Booking Enhanced — IntakeForm, IntakeResponse, Waitlist

-- IntakeForm
CREATE TABLE IF NOT EXISTS "IntakeForm" (
    "id"           TEXT NOT NULL,
    "providerId"   TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "description"  TEXT,
    "questions"    JSONB NOT NULL DEFAULT '[]',
    "serviceIds"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IntakeForm_providerId_providerType_idx"        ON "IntakeForm"("providerId", "providerType");
CREATE INDEX IF NOT EXISTS "IntakeForm_providerId_providerType_isActive_idx" ON "IntakeForm"("providerId", "providerType", "isActive");

-- IntakeResponse
CREATE TABLE IF NOT EXISTS "IntakeResponse" (
    "id"        TEXT NOT NULL,
    "formId"    TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "answers"   JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntakeResponse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IntakeResponse_bookingId_key" ON "IntakeResponse"("bookingId");
CREATE INDEX IF NOT EXISTS "IntakeResponse_formId_idx"            ON "IntakeResponse"("formId");
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_formId_fkey"
    FOREIGN KEY ("formId") REFERENCES "IntakeForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntakeResponse" ADD CONSTRAINT "IntakeResponse_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Waitlist
CREATE TABLE IF NOT EXISTS "Waitlist" (
    "id"           TEXT NOT NULL,
    "providerId"   TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "serviceId"    TEXT NOT NULL,
    "date"         TEXT NOT NULL,
    "startTime"    TEXT NOT NULL,
    "clientUserId" TEXT,
    "clientName"   TEXT NOT NULL,
    "clientEmail"  TEXT NOT NULL,
    "clientPhone"  TEXT,
    "notes"        TEXT,
    "notified"     BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Waitlist_providerId_providerType_date_startTime_idx"
    ON "Waitlist"("providerId", "providerType", "date", "startTime");
CREATE INDEX IF NOT EXISTS "Waitlist_clientEmail_idx" ON "Waitlist"("clientEmail");
