CREATE TABLE IF NOT EXISTS "admin_audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "target_user_id" text,
  "payload" text,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "impersonation_session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "target_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "reason" text NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "ended_at" timestamp with time zone,
  "ip_address" text
);

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_staff" boolean DEFAULT false NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "admin_role" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "admin_invited_by" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "admin_last_login_at" timestamp with time zone;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "account_status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'starter' NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp with time zone;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "mrr_inr" numeric(12, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "suspended_reason" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "suspended_by" text;

CREATE INDEX IF NOT EXISTS "admin_audit_actor_idx" ON "admin_audit_log" ("actor_user_id","created_at");
CREATE INDEX IF NOT EXISTS "admin_audit_action_idx" ON "admin_audit_log" ("action","created_at");
CREATE INDEX IF NOT EXISTS "impersonation_admin_idx" ON "impersonation_session" ("admin_user_id");
CREATE INDEX IF NOT EXISTS "impersonation_target_idx" ON "impersonation_session" ("target_user_id");

UPDATE "user" SET is_staff = true, admin_role = 'super_admin'
WHERE email = 'addisonxmedia@gmail.com' AND is_staff = false;
