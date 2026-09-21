ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NO_PROVIDER';
ALTER TABLE "bookings"
  ADD COLUMN "scheduled_at" TIMESTAMP(3),
  ADD COLUMN "problem_description" TEXT,
  ADD COLUMN "coupon_code" TEXT,
  ADD COLUMN "discount_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "pricing_snapshot" JSONB,
  ADD COLUMN "request_key" TEXT;
CREATE UNIQUE INDEX "bookings_request_key_key" ON "bookings"("request_key");
CREATE INDEX "bookings_status_scheduled_at_idx" ON "bookings"("status", "scheduled_at");
