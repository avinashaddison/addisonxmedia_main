-- 0031_message_schema_repair.sql
--
-- Defensive repair migration. Ensures the `message` table exists with every
-- column that server/db/schema.ts currently declares.
--
-- Why this exists:
--   The `message` table was never created by a versioned migration (0001-0028
--   don't reference it; it was created by drizzle-kit push during early
--   development). That left the production DB schema implicitly tied to
--   whatever shape `drizzle-kit push` happened to generate at the time, with
--   no traceable record. Any column added/renamed in code afterwards
--   (e.g. 0029's twilio_sid -> external_message_id) could silently drift.
--
--   Symptom this migration fixes:
--     GET /api/conversations/:id/messages -> 500 Internal server error
--     because `db.select().from(message)` references columns that the DB
--     doesn't have, throwing a Postgres "column does not exist" error.
--
-- This file is fully idempotent: every statement uses CREATE / ADD COLUMN
-- IF NOT EXISTS so it's safe to run on fresh DBs, partially-migrated DBs,
-- and DBs that already match the target schema.

-- Make sure the enums exist (drizzle-kit push would have created them, but
-- we guarantee them here so this migration is self-contained).
DO $$ BEGIN
  CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create the table if it somehow doesn't exist. (In practice it will exist
-- on every prod DB since webhooks have been writing to it for a while; this
-- branch is purely defensive against fresh-install scenarios.)
CREATE TABLE IF NOT EXISTS "message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL,
  "owner_id" text NOT NULL,
  "direction" message_direction NOT NULL,
  "body" text NOT NULL,
  "status" message_status NOT NULL DEFAULT 'sent',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Ensure every column current schema.ts expects is present. ADD COLUMN IF
-- NOT EXISTS is a no-op when the column is already there, so this is safe
-- to run repeatedly and on partially-migrated DBs.
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "sender_id" text;
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "media_url" text;
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "external_message_id" text;
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "is_ai_generated" boolean NOT NULL DEFAULT false;

-- Indexes that schema.ts declares.
CREATE INDEX IF NOT EXISTS "message_conversation_idx" ON "message" ("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "message_owner_idx" ON "message" ("owner_id");

-- FK constraints are skipped here intentionally — adding a FK retroactively
-- requires the parent rows to all exist, and a defensive repair migration
-- shouldn't risk failing on legacy/orphan rows. The existing
-- `0027_order_contact_fk.sql` pattern adds FKs separately when needed.
