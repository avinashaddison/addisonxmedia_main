DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='message' AND column_name='twilio_sid'
  ) THEN
    ALTER TABLE message RENAME COLUMN twilio_sid TO external_message_id;
  END IF;
END $$;
