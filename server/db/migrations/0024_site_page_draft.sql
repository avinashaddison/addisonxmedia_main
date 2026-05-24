-- 0024_site_page_draft.sql
-- Adds draft/publish workflow to site_page.
--
-- Edits in the Builder go to `draft_sections`. The renderer reads `sections`
-- (the published copy) by default; preview mode (?preview=draft) reads
-- `draft_sections`. Publishing copies draft → sections + bumps last_published_at.
--
-- Backfill: for existing rows, copy sections → draft_sections (they're in
-- sync) and stamp last_published_at = updated_at so they look "published".

ALTER TABLE "site_page"
  ADD COLUMN IF NOT EXISTS "draft_sections"     jsonb,
  ADD COLUMN IF NOT EXISTS "last_published_at"  timestamp with time zone;

UPDATE "site_page"
SET "draft_sections"     = COALESCE("draft_sections", "sections"),
    "last_published_at"  = COALESCE("last_published_at", "updated_at")
WHERE "draft_sections" IS NULL OR "last_published_at" IS NULL;
