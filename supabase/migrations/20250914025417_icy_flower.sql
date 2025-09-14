/*
  # Create autoresponder trigger

  1. New Functions
    - `trigger_autoresponder()` - Function to call autoresponder edge function when emails are received
  
  2. New Triggers
    - `on_email_received` - Trigger that fires after email insert to call autoresponder
  
  3. Test Data
    - Insert test email to verify trigger works
*/

-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  request_id uuid;
  function_url text;
BEGIN
  -- Log that trigger fired
  RAISE LOG 'AUTORESPONDER TRIGGER FIRED! Email ID: %, From: %, To: %', 
    NEW.id, NEW.sender, array_to_string(NEW.receiver, ', ');

  -- Build function URL using environment variable
  function_url := current_setting('SUPABASE_URL', true) || '/functions/v1/autoresponder';
  
  RAISE LOG 'Calling autoresponder at: %', function_url;

  -- Make HTTP request to autoresponder function
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('SUPABASE_SERVICE_ROLE_KEY', true)
    ),
    body := jsonb_build_object(
      'emailId', NEW.id,
      'sender', NEW.sender,
      'receiver', NEW.receiver,
      'subject', NEW.subject
    )
  ) INTO request_id;

  RAISE LOG 'HTTP request sent with ID: %', request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Autoresponder trigger error: %', SQLERRM;
    RETURN NEW; -- Don't fail the email insert
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();

-- Insert a test email to trigger the autoresponder
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
  'test-trigger@example.com',
  ARRAY['trigger-test@yourdomain.com'],
  'Trigger Test Email',
  'This email should trigger the autoresponder function.'
);