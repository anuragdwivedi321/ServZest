CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "LedgerEntryType" AS ENUM ('COMMISSION_DUE', 'COMMISSION_SETTLED', 'SUBSCRIPTION_FEE', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "LedgerStatus" AS ENUM ('DUE', 'SETTLED', 'REVERSED');

CREATE TABLE "subscription_plans" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "worker_subscriptions" (
  "id" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "payment_ref" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ledger_entries" (
  "id" TEXT NOT NULL,
  "worker_id" TEXT NOT NULL,
  "booking_id" TEXT,
  "payment_id" TEXT,
  "type" "LedgerEntryType" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" "LedgerStatus" NOT NULL DEFAULT 'DUE',
  "reference" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settled_at" TIMESTAMP(3),
  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "worker_subscriptions_worker_id_status_ends_at_idx" ON "worker_subscriptions"("worker_id", "status", "ends_at");
CREATE INDEX "ledger_entries_worker_id_status_created_at_idx" ON "ledger_entries"("worker_id", "status", "created_at");
CREATE UNIQUE INDEX "ledger_entries_booking_id_type_key" ON "ledger_entries"("booking_id", "type");
ALTER TABLE "worker_subscriptions" ADD CONSTRAINT "worker_subscriptions_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "worker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "worker_subscriptions" ADD CONSTRAINT "worker_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
