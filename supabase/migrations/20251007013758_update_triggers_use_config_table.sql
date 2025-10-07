/*
  # Update triggers to use system_config table

  1. Updates
    - Modify `trigger_autoresponder()` to read URL and key from system_config table
    - Modify `trigger_process_client_email()` to read URL and key from system_config table
  
  2. Benefits
    - Configuration is centralized and easy to update
    - No dependency on environment variables
    - Works reliably in database context
*/

-- Update trigger_autoresponder to use config table
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  service_key text;
  request_id bigint;
BEGIN
  -- Log that trigger fired
  RAISE NOTICE 'Autoresponder trigger fired for email ID: %', NEW.id;

  -- Get configuration from system_config table
  SELECT value INTO function_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO service_key FROM system_config WHERE key = 'supabase_service_role_key';
  
  IF function_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Supabase configuration not found in system_config table';
    RETURN NEW;
  END IF;
  
  function_url := function_url || '/functions/v1/autoresponder';
  
  -- Call the autoresponder edge function asynchronously
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object('emailId', NEW.id),
      timeout_milliseconds := 30000
    ) INTO request_id;
    
    RAISE NOTICE 'Autoresponder HTTP request sent with ID: %', request_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to trigger autoresponder for email ID %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger_process_client_email to use config table
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

  -- Call the process-client-email edge function asynchronously
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
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