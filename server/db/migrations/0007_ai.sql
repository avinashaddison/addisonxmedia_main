-- 0007_ai.sql
-- Foundation for Addison AI: per-call usage log.
--
-- One row per OpenAI call so we can:
--   1. Bill against per-plan monthly caps (Starter / Growth / Enterprise)
--   2. Show users their AI usage in Settings → Billing
--   3. Audit cost in admin (which feature is burning tokens)
--   4. Detect abuse patterns (runaway loops, scripted hammering)
--
-- The cap check itself is a SUM(weight) over the current calendar month —
-- no separate counter column, so the source of truth is always this table
-- and resets happen automatically on the 1st of each month.
--
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS "ai_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  -- 'reply_suggestion' | 'auto_reply' | 'ad_copy' | 'followup_gen' | 'insights' | 'test'
  "feature" text NOT NULL,
  -- 'gpt-4o-mini' | 'gpt-4o' | etc.
  "model" text NOT NULL,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  -- Cost in INR for this single call (4-decimal precision = 0.01 paise).
  "cost_inr" numeric(10, 4) NOT NULL DEFAULT 0,
  -- How much this call counts toward the monthly cap. Cheap calls (reply
  -- suggestion) = 1. Expensive ones (ad copy on gpt-4o) = 5. Tuned in
  -- server/lib/ai-usage.ts so we can change without a migration.
  "weight" integer NOT NULL DEFAULT 1,
  -- false if the OpenAI call threw — we still log the row (with 0 tokens)
  -- so the admin can see failure rates per feature.
  "ok" boolean NOT NULL DEFAULT true,
  "error_message" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- The hot query is "how many actions has this user used this month" — keep
-- it fast with a composite index on (user_id, created_at).
CREATE INDEX IF NOT EXISTS "ai_usage_user_created_idx"
  ON "ai_usage" ("user_id", "created_at" DESC);

-- For admin dashboards (cost per feature across all users)
CREATE INDEX IF NOT EXISTS "ai_usage_feature_created_idx"
  ON "ai_usage" ("feature", "created_at" DESC);
