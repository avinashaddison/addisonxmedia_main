-- 0040_template_lead.sql
-- Captures "free templates" email signups from the public landing page's
-- "50+ Hindi WhatsApp templates" form. Stored server-side so a lead is never
-- lost even if the visitor never sends the (secondary) WhatsApp message.
-- Dedupe is enforced by the unique index on email.

CREATE TABLE IF NOT EXISTS "template_lead" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"       text NOT NULL,
  "source"      text NOT NULL DEFAULT 'landing_templates',
  "ip_hash"     text,
  "user_agent"  text,
  "emailed_at"  timestamp with time zone,                                      -- set once confirmation email dispatched
  "created_at"  timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "template_lead_email_unq" ON "template_lead"("email");
CREATE INDEX IF NOT EXISTS "template_lead_created_idx" ON "template_lead"("created_at" DESC);
