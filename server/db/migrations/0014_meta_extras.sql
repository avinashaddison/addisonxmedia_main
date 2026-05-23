-- 0014_meta_extras.sql
-- Adds the columns + table needed for the Meta API expansion:
--   - CAPI: pixel_id + capi_test_event_code on meta_config
--   - Catalog: catalog_id on meta_config
--   - CAPI event log so we can debug + dedupe fires
--   - Tier display: messaging_limit_tier cached on meta_config (refreshed periodically)

ALTER TABLE "meta_config"
  ADD COLUMN IF NOT EXISTS "catalog_id"             text,
  ADD COLUMN IF NOT EXISTS "pixel_id"               text,
  ADD COLUMN IF NOT EXISTS "capi_enabled"           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "capi_test_event_code"   text,
  ADD COLUMN IF NOT EXISTS "messaging_limit_tier"   text,
  ADD COLUMN IF NOT EXISTS "quality_rating"         text,
  ADD COLUMN IF NOT EXISTS "tier_refreshed_at"      timestamp with time zone;

CREATE TABLE IF NOT EXISTS "meta_capi_event" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id"         text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "event_name"       text NOT NULL,                       -- 'Lead' | 'Purchase' | ...
  "event_id"         text NOT NULL,                       -- dedupe key
  "event_time"       timestamp with time zone NOT NULL DEFAULT now(),
  "source_type"      text,                                -- 'deal_won' | 'contact_created' | etc.
  "source_id"        text,                                -- related row id (deal.id, contact.id)
  "value_inr"        numeric(10, 2),
  "currency"         text DEFAULT 'INR',
  "user_data"        jsonb,                               -- hashed user_data payload
  "custom_data"      jsonb,
  "response_code"    integer,                             -- Meta response status (200 on success)
  "response_body"    jsonb,
  "fired_at"         timestamp with time zone NOT NULL DEFAULT now()
);

-- Lookups: latest events per user (admin diag) + dedupe by event_id
CREATE INDEX IF NOT EXISTS "meta_capi_event_owner_idx"  ON "meta_capi_event"("owner_id", "fired_at" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "meta_capi_event_id_unq" ON "meta_capi_event"("event_id");
