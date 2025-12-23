/*
  # Add Email Outbox Processing Trigger

  1. Changes
    - Create `trigger_send_email()` function to automatically process outbox emails
    - Add trigger on `email_outbox` table to call send-email edge function
    - Uses system_config table for configuration values
    
  2. Functionality
    - When a new email is inserted into email_outbox with status 'pending'
    - Automatically calls the send-email edge function
    - Edge function processes the email and moves it to email_sent
    
  3. Security
    - Function executes with SECURITY DEFINER to access edge functions
    - Uses service role key from system_config
*/

-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_send_email()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  service_key text;
  request_id bigint;
  json_body jsonb;
BEGIN
  -- Only process if status is 'pending'
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Log that trigger fired
  RAISE NOTICE 'Send email trigger fired for outbox email ID: %', NEW.id;

  -- Get configuration from system_config table
  SELECT value INTO function_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO service_key FROM system_config WHERE key = 'supabase_service_role_key';
  
  IF function_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Supabase configuration not found in system_config table';
    RETURN NEW;
  END IF;
  
  function_url := function_url || '/functions/v1/send-email';

  -- Build JSON body with the email ID
  json_body := jsonb_build_object(
    'emailId', NEW.id::text
  );

  -- Call the send-email edge function asynchronously
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := format('{"Content-Type": "application/json", "Authorization": "Bearer %s"}', service_key)::jsonb,
      body := json_body,
      timeout_milliseconds := 60000
    ) INTO request_id;
    
    RAISE NOTICE 'Send email HTTP request sent with ID: %', request_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to trigger send-email for outbox email ID %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_email_outbox_insert ON email_outbox;

-- Create the trigger
CREATE TRIGGER on_email_outbox_insert
  AFTER INSERT ON email_outbox
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_email();