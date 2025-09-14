/*
  # Recreate Simple Autoresponder Trigger

  1. Changes
    - Drop existing trigger and function completely
    - Create a new simple trigger function that just logs
    - Recreate the trigger on the emails table
    - Test with a simple insert

  2. Testing
    - Includes a test email insert to verify trigger fires
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create a very simple trigger function that just logs
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple log message
  RAISE LOG 'AUTORESPONDER TRIGGER FIRED! Email ID: %, From: %, To: %', NEW.id, NEW.sender, NEW.receiver;
  
  -- Always return NEW to allow the insert to proceed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();

-- Test the trigger by inserting a test email
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
  'test@example.com',
  ARRAY['autoresponder-test@yourdomain.com'],
  'Test Email for Autoresponder Trigger',
  'This is a test email to verify the autoresponder trigger is working.'
);