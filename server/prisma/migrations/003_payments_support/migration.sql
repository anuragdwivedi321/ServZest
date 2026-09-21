ALTER TABLE "worker_profiles" ADD COLUMN "upi_id" TEXT, ADD COLUMN "upi_name" TEXT, ADD COLUMN "last_location_at" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN "payee_upi_id" TEXT, ADD COLUMN "payee_name" TEXT, ADD COLUMN "reported_at" TIMESTAMP(3), ADD COLUMN "confirmed_at" TIMESTAMP(3), ADD COLUMN "confirmed_by" TEXT;
CREATE TABLE "support_tickets" (
 "id" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "category" TEXT NOT NULL,
 "message" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN', "resolution" TEXT,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);
