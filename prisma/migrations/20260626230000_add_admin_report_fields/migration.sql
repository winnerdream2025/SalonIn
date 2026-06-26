-- Phase 6: Admin — add adminNote + resolvedAt to Report

ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "adminNote"  TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "resolvedBy" TEXT;
