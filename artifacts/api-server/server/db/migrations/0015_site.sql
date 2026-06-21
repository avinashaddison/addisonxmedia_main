-- 0015_site.sql
-- Website/storefront builder — Phase 1 (foundation).
--
-- A single `site` row per user holds everything needed to render the public
-- page at /biz/:slug. The template + theme + copy are kept in JSONB columns
-- so future template additions don't need migrations. Pages, leads, analytics
-- ship in later phases (Phase 2-3).
--
-- Slug is unique across all sites — it's the public URL segment.

CREATE TABLE IF NOT EXISTS "site" (
  "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"                 text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "slug"                    text NOT NULL UNIQUE,                       -- /biz/<slug>
  "template"                text NOT NULL DEFAULT 'kirana',             -- 'kirana' | 'salon' | 'restaurant' | 'services'
  "status"                  text NOT NULL DEFAULT 'draft',              -- 'draft' | 'published'
  "published_at"            timestamp with time zone,
  -- Brand / theme (colors, fonts, logo). JSONB so we don't migrate per template.
  "theme"                   jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Editable copy (hero headline, about text, etc.). Keys vary per template.
  -- Anything not set falls back to the auto-fill defaults (WhatsApp profile etc).
  "copy"                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Site-wide SEO. Per-page SEO comes in Phase 2 when site_page is added.
  "seo_title"               text,
  "seo_description"         text,
  "seo_og_image"            text,
  -- Custom domain. NULL = use subdomain only. Verified flag flipped after
  -- we confirm the CNAME points at us (Phase 2).
  "custom_domain"           text UNIQUE,
  "custom_domain_verified"  boolean NOT NULL DEFAULT false,
  -- Crude counter so the overview can show "X views this week" without a
  -- separate analytics table. Replaced by site_analytics_event in Phase 3.
  "view_count"              integer NOT NULL DEFAULT 0,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "site_slug_idx"     ON "site"("slug");
CREATE INDEX IF NOT EXISTS "site_status_idx"   ON "site"("status");
