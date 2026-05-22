-- 0013_cashfree.sql
-- Adds Cashfree Payment Gateway columns to upgrade_request so paid upgrades
-- have a full audit trail (order id, payment id, method) and the webhook
-- handler can look up the row by Cashfree's order_id idempotently.
--
-- The manual-fulfillment flow (status='requested' → admin Activate button)
-- stays intact; Cashfree-driven upgrades fill in the same row's columns and
-- flip status='completed' automatically when the webhook fires.

ALTER TABLE "upgrade_request"
  ADD COLUMN IF NOT EXISTS "cashfree_order_id"           text,
  ADD COLUMN IF NOT EXISTS "cashfree_payment_session_id" text,
  ADD COLUMN IF NOT EXISTS "cashfree_payment_id"         text,
  ADD COLUMN IF NOT EXISTS "cashfree_payment_method"     text,
  ADD COLUMN IF NOT EXISTS "amount_inr"                  numeric(10, 2);

CREATE INDEX IF NOT EXISTS "upgrade_request_cashfree_order_idx"
  ON "upgrade_request"("cashfree_order_id")
  WHERE "cashfree_order_id" IS NOT NULL;
