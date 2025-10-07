/*
  # Fix trigger timeout issue

  1. Changes
    - Update triggers to use increased timeout (30 seconds)
    - Use asynchronous pattern with proper timeout handling
    - Add better error logging
  
  2. Technical Details
    - pg_net.http_post times out after 5s by default
    - Edge functions may take longer to respond
    - Increase timeout to 30000ms (30 seconds)
    - Don't wait for response, just fire and forget
*/

-- Update trigger_autoresponder with timeout handling
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  request_id bigint;
BEGIN
  -- Log that trigger fired
  RAISE NOTICE 'Autoresponder trigger fired for email ID: %', NEW.id;

  -- Build function URL using environment variable
  function_url := current_setting('SUPABASE_URL', true) || '/functions/v1/autoresponder';
  
  -- Call the autoresponder edge function asynchronously with increased timeout
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('SUPABASE_SERVICE_ROLE_KEY', true)
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

-- Update trigger_process_client_email with timeout handling
CREATE OR REPLACE FUNCTION trigger_process_client_email()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
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

  -- Build function URL using environment variable
  function_url := current_setting('SUPABASE_URL', true) || '/functions/v1/process-client-email';

  -- Call the process-client-email edge function asynchronously with increased timeout
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('SUPABASE_SERVICE_ROLE_KEY', true)
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