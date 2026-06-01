-- Add UPI, Binance, and QR code settings to AI Agent & Prebuilt Agent tables
ALTER TABLE "ai_agent" ADD COLUMN IF NOT EXISTS "upi_vpa" text;
ALTER TABLE "ai_agent" ADD COLUMN IF NOT EXISTS "binance_id" text;
ALTER TABLE "ai_agent" ADD COLUMN IF NOT EXISTS "qr_image_url" text;

ALTER TABLE "prebuilt_agent" ADD COLUMN IF NOT EXISTS "upi_vpa" text;
ALTER TABLE "prebuilt_agent" ADD COLUMN IF NOT EXISTS "binance_id" text;
ALTER TABLE "prebuilt_agent" ADD COLUMN IF NOT EXISTS "qr_image_url" text;

-- Add is_reseller flag to Contact table
ALTER TABLE "contact" ADD COLUMN IF NOT EXISTS "is_reseller" boolean NOT NULL DEFAULT false;
