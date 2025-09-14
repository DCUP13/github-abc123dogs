/*
  # Rewrite Autoresponder Trigger

  1. Functions
    - Drop existing trigger function
    - Create new simplified trigger function with better error handling
    - Use proper Supabase edge function calling mechanism

  2. Triggers
    - Drop existing trigger
    - Create new trigger on emails table
    - Ensure trigger fires AFTER INSERT

  3. Testing
    - Insert test email to verify trigger functionality
    - Include comprehensive logging
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  payload JSONB;
  response_status INTEGER;
  response_body TEXT;
BEGIN
  -- Log that the trigger fired
  RAISE NOTICE 'AUTORESPONDER TRIGGER ACTIVATED - Email ID: %, From: %, To: %', 
    NEW.id, NEW.sender, array_to_string(NEW.receiver, ', ');

  -- Build the edge function URL
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/autoresponder';
  
  -- Log the URL we're calling
  RAISE NOTICE 'Calling autoresponder function at: %', function_url;

  -- Prepare the payload
  payload := jsonb_build_object(
    'emailId', NEW.id,
    'sender', NEW.sender,
    'receiver', NEW.receiver,
    'subject', NEW.subject,
    'body', NEW.body,
    'created_at', NEW.created_at
  );

  -- Log the payload
  RAISE NOTICE 'Payload: %', payload::text;

  -- Call the edge function using pg_net
  BEGIN
    SELECT status, content INTO response_status, response_body
    FROM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := payload
    );

    -- Log the response
    RAISE NOTICE 'Autoresponder function response - Status: %, Body: %', response_status, response_body;

    IF response_status >= 200 AND response_status < 300 THEN
      RAISE NOTICE 'SUCCESS: Autoresponder function called successfully for email %', NEW.id;
    ELSE
      RAISE WARNING 'WARNING: Autoresponder function returned status % for email %', response_status, NEW.id;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Log any errors but don't fail the email insert
    RAISE WARNING 'ERROR: Failed to call autoresponder function for email %: %', NEW.id, SQLERRM;
  END;

  -- Always return NEW to allow the email insert to succeed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();

-- Log trigger creation
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Autoresponder trigger recreated successfully!';
END $$;

-- Insert a test email to verify the trigger works
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
  'test-rewrite@example.com',
  ARRAY['rewrite-test@yourdomain.com'],
  'Test Autoresponder Trigger Rewrite',
  'This is a test email to verify the rewritten autoresponder trigger is working properly.'
);

-- Log test email insertion
DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Test email inserted to verify trigger functionality!';
END $$;