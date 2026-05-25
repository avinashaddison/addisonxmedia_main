-- Idempotent rename: only attempt if the old column still exists.
-- The original non-idempotent form (`ALTER TABLE ... RENAME COLUMN twilio_sid TO external_message_id`)
-- failed with `column "twilio_sid" does not exist`:
--   1) on fresh DBs where the message table was created via drizzle-kit push
--      with `external_message_id` already in place, and
--   2) on every re-run (the migration runner re-executes all files on every
--      deploy, see scripts/apply-migrations.ts), once the rename had succeeded once.
-- Either failure broke the build for every subsequent deploy AND, more visibly,
-- left `db.select().from(message)` returning 500 in /api/conversations/:id/messages
-- because Drizzle's schema declares `external_message_id` and the DB column was
-- inconsistent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message' AND column_name = 'twilio_sid'
  ) THEN
    ALTER TABLE message RENAME COLUMN twilio_sid TO external_message_id;
  END IF;
END $$;
