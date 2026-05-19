-- 0005_ads.sql
-- Extend meta_config with Marketing API credentials (ad account + token).
-- Stored alongside WhatsApp creds because both flow from the same Meta Business
-- Manager and most customers will connect them together.
--
-- ad_access_token is stored ENCRYPTED at rest via server/crypto.ts. The route
-- handlers in routes/ads.ts do the encrypt/decrypt — never write plaintext here.

ALTER TABLE "meta_config"
  ADD COLUMN IF NOT EXISTS "ad_account_id" text,
  ADD COLUMN IF NOT EXISTS "ad_access_token" text,
  ADD COLUMN IF NOT EXISTS "ad_account_name" text,
  ADD COLUMN IF NOT EXISTS "ad_account_currency" text,
  ADD COLUMN IF NOT EXISTS "ads_connected_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "ads_last_verified_at" timestamp with time zone;
