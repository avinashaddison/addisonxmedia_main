-- 0021_shipping.sql
-- Shipping zones — owner defines named delivery zones with pincode prefixes
-- and a flat rate. Cart picks the matching zone based on customer pincode
-- (best-match prefix wins). When no zone matches, falls back to "default"
-- zone if defined, else "Shipping calculated separately".
--
-- pincode_prefixes is a comma-separated list of prefixes (3-6 digits).
-- "" prefix = catches anything (default zone).

CREATE TABLE IF NOT EXISTS "shipping_zone" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id"          text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name"              text NOT NULL,                                          -- 'Local (Patna city)' / 'Pan-India'
  "pincode_prefixes"  text NOT NULL DEFAULT '',                               -- '800,801,802' or '' = default
  "rate_inr"          numeric(10, 2) NOT NULL DEFAULT 0,
  "free_above_inr"    numeric(10, 2),                                         -- NULL = never free
  "eta_days"          integer,                                                -- displayed at checkout
  "active"            boolean NOT NULL DEFAULT true,
  "sort_order"        integer NOT NULL DEFAULT 0,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "shipping_zone_owner_idx" ON "shipping_zone"("owner_id", "sort_order");

-- Track shipping zone applied to each order (denormalized name + rate)
ALTER TABLE "customer_order"
  ADD COLUMN IF NOT EXISTS "shipping_zone_id"   uuid REFERENCES "shipping_zone"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "shipping_zone_name" text,
  ADD COLUMN IF NOT EXISTS "customer_pincode"   text;
