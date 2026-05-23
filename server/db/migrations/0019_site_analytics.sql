-- 0019_site_analytics.sql
-- Site-wide event log. One row per pageview / lead-form-submit / cart-add /
-- order-placed event on the public site. Powers the Analytics dashboard
-- (top sources, funnel, daily breakdown).

CREATE TABLE IF NOT EXISTS "site_analytics_event" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "site_id"         uuid NOT NULL REFERENCES "site"("id") ON DELETE CASCADE,
  "owner_id"        text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "event_type"      text NOT NULL,                   -- 'view' | 'lead' | 'cart_add' | 'order'
  "path"            text,                            -- request path (for views)
  "referrer_host"   text,                            -- 'google.com' / 'facebook.com' / 'whatsapp' / 'direct'
  "value_inr"       numeric(10, 2),                  -- order total for 'order' events
  "session_hash"    text,                            -- 24h-rotating per-IP hash (dedupes views)
  "user_agent"      text,
  "occurred_at"     timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "site_analytics_owner_idx" ON "site_analytics_event"("owner_id", "occurred_at" DESC);
CREATE INDEX IF NOT EXISTS "site_analytics_type_idx"  ON "site_analytics_event"("owner_id", "event_type", "occurred_at" DESC);
CREATE INDEX IF NOT EXISTS "site_analytics_dedupe_idx" ON "site_analytics_event"("site_id", "session_hash", "event_type", "path", "occurred_at");
