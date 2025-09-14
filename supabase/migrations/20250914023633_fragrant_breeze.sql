/*
  # Fix autoresponder trigger issue

  1. Debugging
    - Check if pg_net extension exists
    - Verify current triggers on emails table
    - Test basic trigger functionality
  
  2. New Trigger
    - Drop and recreate trigger function with better error handling
    - Use different approach for HTTP calls
    - Add extensive logging to database logs
  
  3. Testing
    - Insert test email to verify trigger fires
    - Check both database and edge function logs
*/

-- First, let's see what triggers currently exist
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

-- Check if pg_net extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net extension is available';
  ELSE
    RAISE NOTICE 'WARNING: pg_net extension is NOT available';
  END IF;
END $$;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create a new trigger function with extensive logging
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
  response_status INT;
  response_body TEXT;
BEGIN
  -- Log that the trigger was fired
  RAISE NOTICE 'AUTORESPONDER TRIGGER FIRED! Email ID: %, From: %, To: %', 
    NEW.id, NEW.sender, array_to_string(NEW.receiver, ', ');

  -- Get Supabase settings
  BEGIN
    SELECT current_setting('app.settings.supabase_url', true) INTO function_url;
    SELECT current_setting('app.settings.service_role_key', true) INTO service_role_key;
    
    IF function_url IS NULL OR function_url = '' THEN
      function_url := 'https://your-project.supabase.co';
      RAISE NOTICE 'Using default Supabase URL: %', function_url;
    END IF;
    
    IF service_role_key IS NULL OR service_role_key = '' THEN
      RAISE NOTICE 'WARNING: No service role key found, using anon key';
      SELECT current_setting('app.settings.supabase_anon_key', true) INTO service_role_key;
    END IF;
    
    -- Build the complete function URL
    function_url := function_url || '/functions/v1/autoresponder';
    RAISE NOTICE 'Calling autoresponder function at: %', function_url;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error getting Supabase settings: %', SQLERRM;
    RETURN NEW; -- Don't fail the email insert
  END;

  -- Try to call the edge function
  BEGIN
    -- Check if pg_net is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
      RAISE NOTICE 'Using pg_net to call autoresponder function...';
      
      -- Make the HTTP request
      SELECT net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(service_role_key, 'missing-key')
        ),
        body := jsonb_build_object(
          'emailId', NEW.id::text,
          'sender', NEW.sender,
          'receiver', NEW.receiver,
          'subject', NEW.subject,
          'body', NEW.body,
          'created_at', NEW.created_at
        )
      ) INTO request_id;
      
      RAISE NOTICE 'HTTP request initiated with ID: %', request_id;
      
      -- Wait a moment and check the response
      PERFORM pg_sleep(1);
      
      SELECT status_code, content 
      FROM net.http_response 
      WHERE id = request_id 
      INTO response_status, response_body;
      
      RAISE NOTICE 'Autoresponder function response - Status: %, Body: %', 
        response_status, response_body;
        
    ELSE
      RAISE NOTICE 'pg_net extension not available, cannot call autoresponder function';
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error calling autoresponder function: %', SQLERRM;
    -- Don't fail the email insert even if the autoresponder fails
  END;

  RAISE NOTICE 'Autoresponder trigger completed for email ID: %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();

RAISE NOTICE 'SUCCESS: New autoresponder trigger created!';

-- Insert a test email to verify the trigger works
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
  'test-new-trigger@example.com',
  ARRAY['new-trigger-test@yourdomain.com'],
  'New Trigger Test Email',
  'This email should trigger the autoresponder function with the new trigger setup.'
);

RAISE NOTICE 'Test email inserted - check logs for trigger activation!';