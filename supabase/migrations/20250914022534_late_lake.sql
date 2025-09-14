/*
  # Debug trigger existence and create simple test

  1. Check if trigger exists
  2. Drop and recreate trigger with basic logging
  3. Insert test email to verify trigger fires
  4. Add simple logging function
*/

-- First, let's see what triggers exist on the emails table
DO $$
BEGIN
  RAISE NOTICE 'Checking existing triggers on emails table...';
  
  FOR rec IN 
    SELECT trigger_name, event_manipulation, action_timing
    FROM information_schema.triggers 
    WHERE event_object_table = 'emails' 
    AND event_object_schema = 'public'
  LOOP
    RAISE NOTICE 'Found trigger: % - % %', rec.trigger_name, rec.action_timing, rec.event_manipulation;
  END LOOP;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_email_received ON emails;

-- Create a very simple logging function first
CREATE OR REPLACE FUNCTION simple_email_logger()
RETURNS TRIGGER AS $$
BEGIN
  -- Just raise a notice that we can see in logs
  RAISE NOTICE 'EMAIL RECEIVED! ID: %, From: %, To: %', NEW.id, NEW.sender, NEW.receiver;
  
  -- Always return NEW for AFTER INSERT triggers
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION simple_email_logger();

-- Verify the trigger was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_email_received' 
    AND event_object_table = 'emails'
  ) THEN
    RAISE NOTICE 'SUCCESS: Trigger on_email_received created successfully!';
  ELSE
    RAISE NOTICE 'ERROR: Trigger on_email_received was not created!';
  END IF;
END $$;

-- Insert a test email to see if trigger fires
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
  'test-trigger@example.com',
  ARRAY['trigger-test@yourdomain.com'],
  'Trigger Test Email',
  'This is a test email to verify the trigger is working.'
);

RAISE NOTICE 'Test email inserted. Check logs for trigger output.';