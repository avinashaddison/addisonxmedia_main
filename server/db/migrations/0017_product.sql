-- 0017_product.sql
-- Product catalog for the website builder (Phase 3 — e-commerce slice).
--
-- Each user has their own catalog. Products show in a grid on the public
-- site /biz/:slug. Per-product WhatsApp order buttons pre-fill a message
-- with the product name + price so the customer just hits send.
--
-- Stock is OPTIONAL — leave null and we won't show / enforce it. Most kirana
-- shops don't want to track stock; restaurants and boutiques do.

CREATE TABLE IF NOT EXISTS "product" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id"      text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name"          text NOT NULL,
  "description"   text,
  "price_inr"     numeric(10, 2) NOT NULL DEFAULT 0,
  "photo_url"     text,
  "stock"         integer,                                              -- NULL = not tracked
  "category"      text,
  "status"        text NOT NULL DEFAULT 'active',                       -- 'active' | 'draft' | 'archived'
  "sort_order"    integer NOT NULL DEFAULT 0,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "product_owner_idx" ON "product"("owner_id", "sort_order");
CREATE INDEX IF NOT EXISTS "product_status_idx" ON "product"("owner_id", "status");
