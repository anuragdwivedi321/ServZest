INSERT INTO "admin_settings" ("key", "value", "description", "updated_at")
VALUES ('subscription_required', '0', 'Set to 1 after production subscription billing is configured', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "subscription_plans" ("id", "name", "price", "duration_days", "is_active", "created_at", "updated_at")
VALUES ('00000000-0000-4000-8000-000000000030', 'Professional Monthly', 299, 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
