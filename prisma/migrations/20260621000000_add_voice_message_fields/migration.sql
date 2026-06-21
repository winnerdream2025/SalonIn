-- Add voice message support to Message
ALTER TABLE "Message" ADD COLUMN "audioUrl" TEXT;
ALTER TABLE "Message" ADD COLUMN "duration" INTEGER;
ALTER TABLE "Message" ADD COLUMN "waveformData" JSONB;
