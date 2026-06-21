-- 0009_workspace_links.sql
-- Workspace-level public links shared with customers from the inbox.
-- The operator configures these once in Settings → Profile, then the
-- LeadPanel surfaces "Send WhatsApp Community link" / "Send Instagram"
-- buttons that fire a templated WhatsApp message in one click.
--
-- Why on `profile` (vs a new table): same lifecycle as displayName/UPI/phone
-- — single row per user, edited together, never need historical versions.
--
-- Idempotent.

ALTER TABLE "profile"
  ADD COLUMN IF NOT EXISTS "whatsapp_community_url" text,
  ADD COLUMN IF NOT EXISTS "instagram_url" text,
  ADD COLUMN IF NOT EXISTS "website_url" text,
  ADD COLUMN IF NOT EXISTS "facebook_url" text;
