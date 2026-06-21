-- 0004_seo_branding.sql
-- Seed editable SEO + branding rows under system_setting. The admin
-- settings UI auto-groups by category, so adding rows here makes them
-- show up in /admin/settings without any frontend code change.
--
-- The server reads these rows when rendering index.html and substitutes
-- the corresponding meta tags, plus serves /sitemap.xml and /robots.txt
-- driven by seo_robots_policy.
--
-- Idempotent — ON CONFLICT DO NOTHING means re-running this migration is
-- safe and doesn't overwrite values the admin has edited in the panel.

INSERT INTO "system_setting" (key, value, category, description) VALUES
  -- ── SEO ─────────────────────────────────────────────────────────────
  ('seo_site_title',
   'AddisonX Media – WhatsApp Marketing, Websites & Automation in Ranchi',
   'seo',
   'The <title> tag and the og:title for the landing page. Keep under 60 chars for Google SERP.'),
  ('seo_site_description',
   'AddisonX Media helps Ranchi businesses grow with WhatsApp marketing, modern websites, AI automation, CRM, billing software, and smart digital solutions for local businesses across India.',
   'seo',
   'meta description + og:description. Keep under 160 chars for full SERP display.'),
  ('seo_site_keywords',
   'WhatsApp marketing Ranchi, WhatsApp business automation Ranchi, website design Ranchi, AI automation, CRM software Ranchi, GST billing software Jharkhand, digital marketing agency Ranchi, AddisonX Media',
   'seo',
   'Comma-separated keywords. Google ignores these but Bing/Yandex still use them.'),
  ('seo_og_image',
   'https://addisonx.in/og-image.png',
   'seo',
   'Open Graph image shown when the page is shared on WhatsApp/Facebook/LinkedIn. 1200x630 PNG.'),
  ('seo_twitter_handle',
   '@addisonxhq',
   'seo',
   'Twitter handle for the twitter:site meta tag.'),
  ('seo_canonical_domain',
   'https://addisonx.in',
   'seo',
   'Primary domain — used for canonical URL. No trailing slash.'),
  ('seo_favicon_url',
   '/favicon.ico',
   'seo',
   'Path to the browser tab favicon. Use a 32x32 .ico for best compatibility.'),
  ('seo_apple_touch_icon_url',
   '/apple-touch-icon.png',
   'seo',
   'Icon shown when users add the site to iOS/Android home screen. 180x180 PNG recommended.'),
  ('seo_robots_policy',
   'index, follow',
   'seo',
   'Robots meta + /robots.txt directive. Set to "noindex, nofollow" before a real launch to keep staging out of Google.'),
  ('seo_google_site_verification',
   '',
   'seo',
   'Google Search Console site verification meta tag content. Leave blank if not using.'),

  -- ── BRANDING ────────────────────────────────────────────────────────
  ('brand_name',
   'Addison X Media',
   'branding',
   'Display name shown in emails, the navbar, and the footer.'),
  ('brand_tagline',
   'WhatsApp marketing for Bharat',
   'branding',
   'Short slogan used in emails and meta og:site_name.'),
  ('brand_support_email',
   'Contact@addisonxmedia.com',
   'branding',
   'Customer support email — shown in footers, emails, suspension notices.'),
  ('brand_sales_email',
   'Sales@addisonxmedia.com',
   'branding',
   'Sales contact — shown on the landing page contact card.'),
  ('brand_phone',
   '+91-9709707311',
   'branding',
   'Primary phone number — landing page contact card + JSON-LD.'),
  ('brand_whatsapp',
   '+91-6206153116',
   'branding',
   'WhatsApp number for live support. Format: +CC-XXXXXXXXXX.'),
  ('brand_address',
   'Itki Road, Piska More, 1st Floor, Vaishwakarma Complex, Hehal, Ranchi, Jharkhand 834005',
   'branding',
   'Full physical address — landing footer + invoices + JSON-LD localBusiness.'),
  ('brand_gst_number',
   '20IARPK8159R1ZN',
   'branding',
   'GST registration number — shown on landing footer and on invoices.')
ON CONFLICT (key) DO NOTHING;
