CREATE TABLE IF NOT EXISTS "system_setting" (
  "key" text PRIMARY KEY,
  "value" text,
  "category" text NOT NULL DEFAULT 'general',
  "description" text,
  "updated_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO "system_setting" (key, value, category, description) VALUES
  ('razorpay_live_mode', 'false', 'billing', 'When ON, refunds and subscription payments hit live Razorpay. OFF = test mode.'),
  ('razorpay_key_id', '', 'billing', 'Razorpay Key ID. Stored separate from the secret which lives in env.'),
  ('feature_ai_replies', 'true', 'features', 'Master toggle for Addison AI reply suggestions across all workspaces.'),
  ('feature_click_to_whatsapp_ads', 'true', 'features', 'Master toggle for the Ads Marketing module (Meta + Google).'),
  ('feature_pay_in_chat', 'true', 'features', 'UPI / Razorpay payment links inside WhatsApp chat.'),
  ('feature_diwali_banner', 'true', 'features', 'Show the Diwali offer announcement bar on landing.'),
  ('maintenance_mode', 'false', 'system', 'When ON, customers see a maintenance screen instead of /app.'),
  ('signup_enabled', 'true', 'system', 'When OFF, /auth signup form is hidden (login still works).')
ON CONFLICT (key) DO NOTHING;
