-- AddColumn: structured pay fields to WorkerProfile
ALTER TABLE "WorkerProfile" ADD COLUMN "workerPayType" TEXT;
ALTER TABLE "WorkerProfile" ADD COLUMN "payMin"        DOUBLE PRECISION;
ALTER TABLE "WorkerProfile" ADD COLUMN "payMax"        DOUBLE PRECISION;
ALTER TABLE "WorkerProfile" ADD COLUMN "payPercentage" DOUBLE PRECISION;
ALTER TABLE "WorkerProfile" ADD COLUMN "seatRate"      DOUBLE PRECISION;

-- AddColumn: structured pay fields to JobPost
ALTER TABLE "JobPost" ADD COLUMN "jobPayType"    TEXT;
ALTER TABLE "JobPost" ADD COLUMN "payMin"        DOUBLE PRECISION;
ALTER TABLE "JobPost" ADD COLUMN "payMax"        DOUBLE PRECISION;
ALTER TABLE "JobPost" ADD COLUMN "payPercentage" DOUBLE PRECISION;
ALTER TABLE "JobPost" ADD COLUMN "seatRate"      DOUBLE PRECISION;
ALTER TABLE "JobPost" ADD COLUMN "payNote"       TEXT;
