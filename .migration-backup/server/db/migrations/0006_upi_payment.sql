-- 0006_upi_payment.sql
-- Add UPI payment settings to profile so each user can have their own
-- payment endpoint (Virtual Payment Address + display name shown to payer).
--
-- We store the VPA + display name on profile rather than system_setting
-- because UPI IDs are per-user (each operator has their own account /
-- business UPI ID), not workspace-level config.
--
-- Idempotent — ADD COLUMN IF NOT EXISTS so re-running the migration is safe.

ALTER TABLE "profile"
  ADD COLUMN IF NOT EXISTS "upi_vpa" text,
  ADD COLUMN IF NOT EXISTS "upi_display_name" text;
