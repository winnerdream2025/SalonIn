-- Phase 2: Client Identity — ClientProfile model

CREATE TABLE IF NOT EXISTS "ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "photoUrl" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "placeId" TEXT,
    "formattedAddress" TEXT,
    "preferredSpecialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClientProfile_userId_key" ON "ClientProfile"("userId");
CREATE INDEX IF NOT EXISTS "ClientProfile_userId_idx" ON "ClientProfile"("userId");

ALTER TABLE "ClientProfile"
    ADD CONSTRAINT "ClientProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
