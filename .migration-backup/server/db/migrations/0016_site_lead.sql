-- 0016_site_lead.sql
-- Lead capture for the website builder. A site_lead row is created whenever
-- a visitor submits the public form on /biz/:slug. Triggers a contact insert
-- (handled in app code, not via SQL trigger) so the lead shows up in the
-- existing CRM flow.

CREATE TABLE IF NOT EXISTS "site_lead" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "site_id"       uuid NOT NULL REFERENCES "site"("id") ON DELETE CASCADE,
  "owner_id"      text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name"          text NOT NULL,
  "phone"         text,
  "email"         text,
  "message"       text,
  "source_path"   text,                                                       -- /biz/<slug>
  "user_agent"    text,
  "ip_hash"       text,                                                       -- hashed for privacy
  -- Whether this lead has been pushed to the contacts table. Lets us re-sync
  -- on failure without duplicating.
  "contact_id"    uuid,
  "contacted_at"  timestamp with time zone,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "site_lead_owner_idx" ON "site_lead"("owner_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "site_lead_site_idx"  ON "site_lead"("site_id", "created_at" DESC);
