-- Add foreign key constraint on customer_order.contact_id -> contact.id
-- Using DO block to skip gracefully if constraint already exists
DO $$ BEGIN
  ALTER TABLE customer_order ADD CONSTRAINT customer_order_contact_id_fk 
    FOREIGN KEY (contact_id) REFERENCES contact(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
