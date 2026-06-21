-- 0010_ad_attribution.sql
-- Ad-to-Sale attribution chain. When a customer clicks a Meta Click-to-
-- WhatsApp (CTW) ad and starts a chat, Meta's webhook includes a `referral`
-- object on the first inbound message containing source_id (the ad id),
-- ctwa_clid (the click id), and headline.
--
-- We capture this on the conversation row so we can later join:
--   campaign.id ← conversation.source_ad_id ← deal.conversation_id ← message
-- and compute end-to-end ROAS (rupees in / rupees spent).
--
-- All columns are nullable — most conversations are organic (no referral)
-- and that's fine; only ad-sourced conversations get a non-null source_ad_id.
--
-- Idempotent.

ALTER TABLE "conversation"
  -- Meta ad ID from referral.source_id. Joins to ad_campaign or the live
  -- Meta Marketing API when we don't have a local row for the ad.
  ADD COLUMN IF NOT EXISTS "source_ad_id" text,
  -- referral.headline — the ad's headline. Useful for showing context in
  -- the inbox ("This lead came from your Diwali Sale ad").
  ADD COLUMN IF NOT EXISTS "source_headline" text,
  -- referral.ctwa_clid — unique per click. Lets us count clicks-that-chatted
  -- vs clicks-that-didn't (CTR-to-conversation funnel).
  ADD COLUMN IF NOT EXISTS "ctwa_click_id" text,
  -- referral.source_type — "ad" | "post" etc. Most are "ad".
  ADD COLUMN IF NOT EXISTS "source_type" text;

-- Hot query: "all conversations sourced from this ad in this date range"
CREATE INDEX IF NOT EXISTS "conversation_source_ad_idx"
  ON "conversation" ("source_ad_id", "created_at" DESC)
  WHERE "source_ad_id" IS NOT NULL;
