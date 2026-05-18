CREATE TABLE IF NOT EXISTS "two_factor" (
  "id" text PRIMARY KEY,
  "secret" text NOT NULL,
  "backup_codes" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "two_factor_user_id_unique" ON "two_factor"("user_id");
