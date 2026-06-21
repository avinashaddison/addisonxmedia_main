-- 0018_order.sql
-- Orders + line items for the website builder e-commerce flow.
--
-- "order" is reserved in SQL — we name the table `customer_order` to avoid
-- escaping it everywhere. Application code refers to it as `order` via the
-- Drizzle alias.
--
-- Status flow: new → confirmed → shipped → delivered (or cancelled at any step).
-- Source tracks where the order originated (cart, manual log, WhatsApp).
--
-- Customer info is denormalized onto the order row even when contact_id is
-- set, so historical orders show the customer state at order time (not after
-- they later update their phone number in the CRM).

CREATE TABLE IF NOT EXISTS "customer_order" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id"          text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "site_id"           uuid REFERENCES "site"("id") ON DELETE SET NULL,
  "order_number"      integer NOT NULL,                                       -- per-owner sequential, displayed as #1042
  "customer_name"     text NOT NULL,
  "customer_phone"    text,
  "customer_email"    text,
  "customer_address"  text,
  "subtotal_inr"      numeric(10, 2) NOT NULL DEFAULT 0,
  "shipping_inr"      numeric(10, 2) NOT NULL DEFAULT 0,
  "discount_inr"      numeric(10, 2) NOT NULL DEFAULT 0,
  "total_inr"         numeric(10, 2) NOT NULL DEFAULT 0,
  "status"            text NOT NULL DEFAULT 'new',                            -- new | confirmed | shipped | delivered | cancelled
  "payment_method"    text,                                                   -- upi | cod | cashfree | null
  "payment_status"    text NOT NULL DEFAULT 'pending',                        -- pending | paid | refunded
  "source"            text NOT NULL DEFAULT 'website',                        -- website | whatsapp | manual
  "notes"             text,                                                   -- customer's note OR seller's internal note
  "contact_id"        uuid,                                                   -- linked CRM contact (deduped by phone)
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_order_owner_number_idx" ON "customer_order"("owner_id", "order_number");
CREATE INDEX IF NOT EXISTS "customer_order_owner_idx"  ON "customer_order"("owner_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "customer_order_status_idx" ON "customer_order"("owner_id", "status", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "order_item" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id"            uuid NOT NULL REFERENCES "customer_order"("id") ON DELETE CASCADE,
  "product_id"          uuid REFERENCES "product"("id") ON DELETE SET NULL,    -- nullable so deleting a product doesn't lose history
  "product_name"        text NOT NULL,                                         -- snapshot at order time
  "product_photo_url"   text,
  "unit_price_inr"      numeric(10, 2) NOT NULL,
  "quantity"            integer NOT NULL DEFAULT 1,
  "line_total_inr"      numeric(10, 2) NOT NULL,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "order_item_order_idx" ON "order_item"("order_id");
