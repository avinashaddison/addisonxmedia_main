-- 0022_site_page.sql
-- Multi-page support. A site_page row per (site, path). `sections` is an
-- ordered JSONB array — each element is { type: 'hero'|'about'|..., props: {...} }.
--
-- Default pages: '/' (home), '/about', '/contact'. Admin can add custom paths.
-- The renderer reads site_page where path = current request path; falls back
-- to the existing single-page Kirana template when no pages are defined.

CREATE TABLE IF NOT EXISTS "site_page" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "site_id"      uuid NOT NULL REFERENCES "site"("id") ON DELETE CASCADE,
  "owner_id"     text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "path"         text NOT NULL,                                  -- '/' | '/about' | '/contact' | '/menu'
  "title"        text,                                            -- per-page SEO + nav label
  "sections"     jsonb NOT NULL DEFAULT '[]'::jsonb,
  "sort_order"   integer NOT NULL DEFAULT 0,
  "active"       boolean NOT NULL DEFAULT true,
  "seo_title"    text,
  "seo_description" text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "site_page_unq" ON "site_page"("site_id", "path");
CREATE INDEX IF NOT EXISTS "site_page_owner_idx" ON "site_page"("owner_id");
