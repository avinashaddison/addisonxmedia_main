-- 0012_webhook_orphan.sql
-- Captures inbound WhatsApp webhook events that arrived for a phone_number_id
-- we have no meta_config row for. Without this, those messages used to fall
-- silently into a console.warn — invisible at scale, with no way to recover
-- from in-app. With this table, admins can spot the issue + retroactively
-- claim the orphans to the correct user account.

CREATE TABLE IF NOT EXISTS "webhook_orphan" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "phone_number_id" text NOT NULL,
  "display_phone_number" text,
  "from_phone" text,
  "from_name" text,
  "message_preview" text,
  "raw" jsonb,
  "claimed_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "claimed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "webhook_orphan_phone_idx"   ON "webhook_orphan"("phone_number_id");
CREATE INDEX IF NOT EXISTS "webhook_orphan_created_idx" ON "webhook_orphan"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "webhook_orphan_unclaimed_idx" ON "webhook_orphan"("created_at" DESC) WHERE "claimed_user_id" IS NULL;
