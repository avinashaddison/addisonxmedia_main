-- 0011_upgrade_request.sql
-- Plan-upgrade requests submitted from the in-app /app/upgrade page.
--
-- Why a queue instead of a direct payment integration: Razorpay KYC takes
-- 3-7 days to approve, and we don't want to block product launch on that.
-- Customers click "Upgrade to Growth" → row inserted here with status
-- 'requested' → admin sees it + sends a Razorpay payment link via WhatsApp
-- → on payment confirm, admin uses /api/admin/workspaces/:id (existing) to
-- bump the user's plan + sets this row to 'completed'.
--
-- Once Razorpay is live we keep this table — it becomes the audit trail of
-- every plan-change attempt, which is useful for churn analysis.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS "upgrade_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  -- 'starter' | 'growth' | 'scale' | 'enterprise'
  "target_plan" text NOT NULL,
  -- 'monthly' | 'annual' — annual = 12 months pay, 14 months access
  "billing_cycle" text NOT NULL DEFAULT 'monthly',
  -- 'requested' | 'contacted' | 'paid' | 'completed' | 'declined' | 'cancelled'
  "status" text NOT NULL DEFAULT 'requested',
  -- Optional reason / context the customer types in the upgrade dialog
  "customer_note" text,
  -- Admin notes after manual fulfillment (Razorpay payment link sent, paid,
  -- etc.). Not shown to customer.
  "admin_notes" text,
  -- Razorpay payment_id once we wire it in. Null until then.
  "razorpay_payment_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "upgrade_request_user_idx"
  ON "upgrade_request" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "upgrade_request_status_idx"
  ON "upgrade_request" ("status", "created_at" DESC);
