-- 0023_site_advanced.sql
-- "Advanced" options on the site row — tracking pixels, custom favicon,
-- indexing toggle, custom <head> injection. These let power users wire up
-- their own analytics without us building dedicated integrations for each.

ALTER TABLE "site"
  ADD COLUMN IF NOT EXISTS "favicon_url"      text,
  ADD COLUMN IF NOT EXISTS "ga4_id"           text,         -- e.g. G-XXXXXXX
  ADD COLUMN IF NOT EXISTS "meta_pixel_id"    text,         -- e.g. 123456789
  ADD COLUMN IF NOT EXISTS "custom_head_html" text,         -- raw HTML; admin trusts the user
  ADD COLUMN IF NOT EXISTS "allow_indexing"   boolean NOT NULL DEFAULT true;
