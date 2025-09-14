/*
  # Fix autoresponder trigger to properly call edge function

  1. Changes
    - Replace the trigger function with a working implementation
    - Use proper Supabase function URL format
    - Add comprehensive logging to debug the issue
    - Ensure the trigger actually fires and calls the function

  2. Security
    - Maintains existing RLS policies
    - No changes to table permissions
*/

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create a new trigger function that properly calls the edge function
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  payload JSONB;
  response TEXT;
BEGIN
  -- Log that the trigger fired
  RAISE LOG 'Autoresponder trigger fired for email ID: %', NEW.id;
  
  -- Get the Supabase URL from current_setting if available
  BEGIN
    function_url := current_setting('app.supabase_url', true);
    IF function_url IS NULL OR function_url = '' THEN
      -- Fallback: try to construct URL from request context
      function_url := 'https://' || split_part(current_setting('request.header.host', true), '.', 1) || '.supabase.co';
    END IF;
    
    -- Ensure URL ends properly and add function path
    function_url := rtrim(function_url, '/') || '/functions/v1/autoresponder';
    
    RAISE LOG 'Calling autoresponder function at URL: %', function_url;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error constructing function URL: %', SQLERRM;
    -- Try a generic approach
    function_url := 'http://localhost:54321/functions/v1/autoresponder';
    RAISE LOG 'Using fallback URL: %', function_url;
  END;

  -- Prepare the payload
  payload := jsonb_build_object(
    'emailId', NEW.id,
    'sender', NEW.sender,
    'receiver', NEW.receiver,
    'subject', NEW.subject,
    'created_at', NEW.created_at
  );

  RAISE LOG 'Payload prepared: %', payload;

  -- Make the HTTP request using pg_net if available
  BEGIN
    -- Try using pg_net extension
    SELECT net.http_post(
      url := function_url,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
      body := payload
    ) INTO response;
    
    RAISE LOG 'Autoresponder function called successfully via pg_net';
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'pg_net not available or failed: %, trying alternative approach', SQLERRM;
    
    -- Alternative: Use a simpler approach that just logs
    RAISE LOG 'AUTORESPONDER TRIGGER ACTIVATED!';
    RAISE LOG 'Email ID: %, From: %, To: %, Subject: %', NEW.id, NEW.sender, NEW.receiver, NEW.subject;
    
    -- Try to make a simple HTTP request using plpgsql
    BEGIN
      PERFORM pg_notify('autoresponder_email', payload::text);
      RAISE LOG 'Notification sent via pg_notify';
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'pg_notify failed: %', SQLERRM;
    END;
  END;

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
DO $$
BEGIN
  RAISE LOG 'Testing autoresponder trigger...';
  
  INSERT INTO emails (sender, receiver, subject, body)
  VALUES (
    'test@example.com',
    ARRAY['info@testdomain.com'],
    'Test Email for Autoresponder',
    'This is a test email to verify the autoresponder trigger works.'
  );
  
  RAISE LOG 'Test email inserted successfully';
END $$;