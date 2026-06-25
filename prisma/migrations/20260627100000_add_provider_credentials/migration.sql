-- Add providerEmail and providerPassword to ProviderBookingProfile
ALTER TABLE "ProviderBookingProfile"
  ADD COLUMN IF NOT EXISTS "providerEmail"    TEXT,
  ADD COLUMN IF NOT EXISTS "providerPassword" TEXT;
