-- 0008_ai_persona.sql
-- Workspace-level "Train Addison" persona — what the AI knows about this
-- business, how it should sound, and where it must stop.
--
-- Single row per workspace (one user = one workspace today, so PK on
-- user_id is sufficient). When a workspace has no row yet, the
-- getPersonaWithDefaults() helper returns sensible defaults so brand-new
-- accounts can use AI features without filling the form first.
--
-- Idempotent — ADD COLUMN / CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "workspace_ai_persona" (
  "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "business_name" text NOT NULL DEFAULT '',
  -- Free-text paragraph: what the business sells, who the customers are.
  -- Powers the bulk of the AI's grounding — every reply uses this as context.
  "what_we_sell" text NOT NULL DEFAULT '',
  -- 'friendly' | 'professional' | 'casual' | 'urgent_sales'
  -- Maps to a tone snippet injected into the system prompt.
  "tone" text NOT NULL DEFAULT 'friendly',
  -- 'hinglish' (default for Indian SMBs) | 'hindi' | 'english'
  -- Hinglish = roman-script Hindi/English code-switching, which is how
  -- most Indian WhatsApp conversations actually look.
  "response_language" text NOT NULL DEFAULT 'hinglish',
  -- Guardrails the AI MUST respect — phrased as instructions, multi-line.
  "always_say" text NOT NULL DEFAULT '',
  "never_say" text NOT NULL DEFAULT '',
  -- Comma-separated keywords. If an inbound message contains any of these,
  -- the AI surfaces an "escalate to human" suggestion instead of a draft.
  -- Default covers complaints, legal threats, refund requests, scam reports.
  "escalate_keywords" text NOT NULL DEFAULT 'refund, complaint, legal, lawyer, scam, police, cheating, fraud',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
