-- CreateTable
CREATE TABLE "SalonStaff" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "note" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalonStaff_salonId_workerId_key" ON "SalonStaff"("salonId", "workerId");

-- CreateIndex
CREATE INDEX "SalonStaff_salonId_idx" ON "SalonStaff"("salonId");

-- CreateIndex
CREATE INDEX "SalonStaff_workerId_idx" ON "SalonStaff"("workerId");

-- AddForeignKey
ALTER TABLE "SalonStaff" ADD CONSTRAINT "SalonStaff_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "SalonProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonStaff" ADD CONSTRAINT "SalonStaff_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
