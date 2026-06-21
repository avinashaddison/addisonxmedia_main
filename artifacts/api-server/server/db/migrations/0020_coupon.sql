-- 0020_coupon.sql
-- Discount codes for the website cart. Owner creates codes in admin,
-- customer enters at checkout; validation happens in /biz/:slug/order
-- before the order is committed.

CREATE TABLE IF NOT EXISTS "coupon" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id"          text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "code"              text NOT NULL,                                          -- uppercase, no spaces
  "discount_type"     text NOT NULL DEFAULT 'percent',                        -- 'percent' | 'flat'
  "discount_value"    numeric(10, 2) NOT NULL DEFAULT 0,                      -- 10 = 10% or ₹10
  "min_cart_inr"      numeric(10, 2) NOT NULL DEFAULT 0,                      -- 0 = no minimum
  "max_uses"          integer,                                                -- NULL = unlimited
  "used_count"        integer NOT NULL DEFAULT 0,
  "starts_at"         timestamp with time zone,                               -- NULL = always valid
  "expires_at"        timestamp with time zone,                               -- NULL = never expires
  "active"            boolean NOT NULL DEFAULT true,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "coupon_owner_code_idx" ON "coupon"("owner_id", "code");
CREATE INDEX IF NOT EXISTS "coupon_owner_idx" ON "coupon"("owner_id", "created_at" DESC);

-- Track the actual coupon redemption on each order
ALTER TABLE "customer_order"
  ADD COLUMN IF NOT EXISTS "coupon_id"   uuid REFERENCES "coupon"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "coupon_code" text;
