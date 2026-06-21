-- 0025_booking.sql
-- Appointment bookings — primary surface for service businesses (salons,
-- clinics, gyms, coaches, repair services). The salon template's booking
-- modal saves rows here, the seller manages them in the Bookings admin page.
--
-- Source can be 'website' (booking form), 'whatsapp' (manually logged
-- from chat), or 'manual' (seller typed it in directly). Status flows
-- new → confirmed → completed (or cancelled / no_show at any step).

CREATE TABLE IF NOT EXISTS "booking" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id"            text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "site_id"             uuid REFERENCES "site"("id") ON DELETE SET NULL,
  "booking_number"      integer NOT NULL,                                        -- per-owner sequential
  -- Service snapshot (in case product is later edited/deleted)
  "service_id"          uuid REFERENCES "product"("id") ON DELETE SET NULL,
  "service_name"        text NOT NULL,
  "service_price_inr"   numeric(10, 2) NOT NULL DEFAULT 0,
  "service_duration_min" integer,
  -- Booking time
  "booking_date"        date NOT NULL,                                            -- YYYY-MM-DD
  "booking_time"        text NOT NULL,                                            -- HH:MM 24h, '14:30'
  -- Customer details
  "customer_name"       text NOT NULL,
  "customer_phone"      text,
  "customer_email"      text,
  "notes"               text,
  -- Metadata
  "status"              text NOT NULL DEFAULT 'new',                              -- new | confirmed | completed | cancelled | no_show
  "source"              text NOT NULL DEFAULT 'website',                          -- website | whatsapp | manual
  "contact_id"          uuid,                                                     -- linked CRM contact
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "booking_owner_number_idx" ON "booking"("owner_id", "booking_number");
CREATE INDEX IF NOT EXISTS "booking_owner_date_idx"   ON "booking"("owner_id", "booking_date", "booking_time");
CREATE INDEX IF NOT EXISTS "booking_status_idx"       ON "booking"("owner_id", "status", "booking_date");
