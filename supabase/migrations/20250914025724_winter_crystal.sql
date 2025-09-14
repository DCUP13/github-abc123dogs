/*
  # Debug autoresponder trigger

  1. Changes
    - Drop and recreate trigger function with better debugging
    - Add test to verify trigger fires
    - Use actual Supabase URL from environment
    - Add more detailed logging

  2. Testing
    - Inserts test email to verify trigger execution
    - Logs should show in Database → Logs
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create improved trigger function with better debugging
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  request_id uuid;
  function_url text;
  response_data jsonb;
BEGIN
  -- Always log that trigger fired
  RAISE NOTICE 'AUTORESPONDER TRIGGER FIRED! Email ID: %, From: %, To: %', 
    NEW.id, NEW.sender, array_to_string(NEW.receiver, ', ');

  -- Build function URL using environment variable
  function_url := current_setting('SUPABASE_URL', true) || '/functions/v1/autoresponder';
  
  -- If SUPABASE_URL not set, try to construct it
  IF function_url IS NULL OR function_url = '/functions/v1/autoresponder' THEN
    function_url := 'https://' || current_setting('SUPABASE_PROJECT_REF', true) || '.supabase.co/functions/v1/autoresponder';
  END IF;
  
  RAISE NOTICE 'Calling autoresponder at URL: %', function_url;

  -- Make HTTP request
  BEGIN
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
        'subject', NEW.subject,
        'body', NEW.body
      )
    ) INTO request_id;

    RAISE NOTICE 'HTTP request completed with ID: %', request_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'HTTP request failed: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Autoresponder trigger error: %', SQLERRM;
    RETURN NEW; -- Don't fail the email insert
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();

-- Test the trigger immediately
DO $$
BEGIN
  RAISE NOTICE 'About to insert test email...';
  
  INSERT INTO emails (sender, receiver, subject, body) 
  VALUES (
    'debug-test@example.com',
    ARRAY['debug-recipient@example.com'],
    'Debug Test Email - ' || now()::text,
    'This email should trigger the autoresponder function.'
  );
  
  RAISE NOTICE 'Test email inserted successfully!';
END $$;