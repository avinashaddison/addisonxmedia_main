-- Add digital product settings to product table
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "is_digital" boolean NOT NULL DEFAULT false;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "validity" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "activation_mail" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "activation_time" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "price_usd" numeric(10, 2);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "is_reseller" boolean NOT NULL DEFAULT false;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "reseller_price" numeric(10, 2);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "reseller_price_usd" numeric(10, 2);
