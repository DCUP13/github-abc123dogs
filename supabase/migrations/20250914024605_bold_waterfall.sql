/*
  # Recreate autoresponder trigger from scratch

  1. New Functions
    - `trigger_autoresponder()` - Calls the autoresponder edge function when emails are inserted
  
  2. New Triggers
    - `on_email_received` - Fires after INSERT on emails table
  
  3. Test Data
    - Inserts a test email to verify the trigger works
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  request_id uuid;
  supabase_url text;
  service_role_key text;
  function_url text;
BEGIN
  -- Log that trigger fired
  RAISE LOG 'AUTORESPONDER TRIGGER FIRED! Email ID: %, From: %, To: %', 
    NEW.id, NEW.sender, array_to_string(NEW.receiver, ', ');

  -- Get Supabase settings
  SELECT current_setting('app.settings.supabase_url', true) INTO supabase_url;
  SELECT current_setting('app.settings.service_role_key', true) INTO service_role_key;
  
  -- Use default URL if setting not found
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://your-project.supabase.co';
  END IF;
  
  -- Build function URL
  function_url := supabase_url || '/functions/v1/autoresponder';
  
  RAISE LOG 'Calling autoresponder at: %', function_url;

  -- Make HTTP request to autoresponder function
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, 'fallback-key')
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

RAISE LOG 'Autoresponder trigger created successfully!';

-- Insert a test email to trigger the autoresponder
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
  'test-simple@example.com',
  ARRAY['simple-test@yourdomain.com'],
  'Simple Test Email',
  'This is a test email to trigger the autoresponder.'
);

RAISE LOG 'Test email inserted to trigger autoresponder!';