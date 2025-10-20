/*
  # Fix trigger_process_client_email to include email ID

  ## Changes
  - Update trigger function to match the working format from update_triggers_use_config_table
  - Include email ID in the request body for reply tracking
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
BEGIN
  -- Log that trigger fired
  RAISE NOTICE 'Process client email trigger fired for email ID: %', NEW.id;

  -- Extract email data
  email_from := NEW.sender;
  email_subject := NEW.subject;
  email_body := NEW.body;

  -- Get configuration from system_config table
  SELECT value INTO function_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO service_key FROM system_config WHERE key = 'supabase_service_role_key';
  
  IF function_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Supabase configuration not found in system_config table';
    RETURN NEW;
  END IF;
  
  function_url := function_url || '/functions/v1/process-client-email';

  -- Call the process-client-email edge function asynchronously with email ID
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'id', NEW.id,
        'from', email_from,
        'subject', email_subject,
        'body', email_body,
        'received_at', NEW.created_at
      ),
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