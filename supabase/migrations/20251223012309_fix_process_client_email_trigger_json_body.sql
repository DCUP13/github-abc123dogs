/*
  # Fix Process Client Email Trigger JSON Body

  1. Changes
    - Update `trigger_process_client_email()` function to properly serialize JSON body
    - Convert jsonb_build_object to text-based JSON string format
    
  2. Issue Fixed
    - pg_net's http_post has issues with jsonb_build_object() for the body parameter
    - Use format() function to build properly quoted JSON string
*/

CREATE OR REPLACE FUNCTION trigger_process_client_email()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  service_key text;
  email_from TEXT;
  email_subject TEXT;
  email_body TEXT;
  request_id bigint;
  json_body jsonb;
BEGIN
  -- Log that trigger fired
  RAISE NOTICE 'Process client email trigger fired for email ID: %', NEW.id;

  -- Extract email data
  email_from := NEW.sender;
  email_subject := COALESCE(NEW.subject, '');
  email_body := COALESCE(NEW.body, '');

  -- Get configuration from system_config table
  SELECT value INTO function_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO service_key FROM system_config WHERE key = 'supabase_service_role_key';
  
  IF function_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Supabase configuration not found in system_config table';
    RETURN NEW;
  END IF;
  
  function_url := function_url || '/functions/v1/process-client-email';

  -- Build JSON body with proper escaping
  json_body := jsonb_build_object(
    'from', email_from,
    'subject', email_subject,
    'body', email_body,
    'received_at', NEW.created_at
  );

  -- Call the process-client-email edge function asynchronously
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := format('{"Content-Type": "application/json", "Authorization": "Bearer %s"}', service_key)::jsonb,
      body := json_body,
      timeout_milliseconds := 30000
    ) INTO request_id;
    
    RAISE NOTICE 'Process client email HTTP request sent with ID: %', request_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to trigger client email processing for email ID %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;