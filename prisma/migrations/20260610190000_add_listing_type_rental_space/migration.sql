-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('JOB', 'RENTAL', 'SPACE');

-- AlterEnum
ALTER TYPE "EmploymentType" ADD VALUE 'CONTRACT';
ALTER TYPE "EmploymentType" ADD VALUE 'SEASONAL';
ALTER TYPE "EmploymentType" ADD VALUE 'APPRENTICESHIP';
ALTER TYPE "EmploymentType" ADD VALUE 'FREELANCE';

-- AlterTable
ALTER TABLE "JobPost" ADD COLUMN "listingType" "ListingType" NOT NULL DEFAULT 'JOB',
ADD COLUMN "spacePhotos" TEXT[] DEFAULT '{}',
ADD COLUMN "spaceSize" TEXT,
ADD COLUMN "spaceAmenities" TEXT[] DEFAULT '{}',
ADD COLUMN "rentalDeposit" DOUBLE PRECISION,
ADD COLUMN "availableFrom" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "JobPost_listingType_isActive_idx" ON "JobPost"("listingType", "isActive");
