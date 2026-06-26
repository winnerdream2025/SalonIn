-- Phase B: Booking Operations extensions

-- Add new NotificationType values
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOOKING_NO_SHOW';
