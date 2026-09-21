ALTER TABLE "users"
  ADD COLUMN "consented_at" TIMESTAMP(3),
  ADD COLUMN "consent_version" TEXT,
  ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "worker_profiles"
  ADD COLUMN "identity_last4" TEXT,
  ADD COLUMN "identity_method" TEXT,
  ADD COLUMN "kyc_consent_at" TIMESTAMP(3),
  ADD COLUMN "kyc_submitted_at" TIMESTAMP(3),
  ADD COLUMN "kyc_reviewed_at" TIMESTAMP(3),
  ADD COLUMN "kyc_reviewed_by" TEXT,
  ADD COLUMN "kyc_rejection_reason" TEXT;

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "actor_id" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "metadata" JSONB,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");
