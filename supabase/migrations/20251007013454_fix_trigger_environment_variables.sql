/*
  # Fix trigger functions to use correct environment variables

  1. Updates
    - Update `trigger_autoresponder()` to use SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    - Update `trigger_process_client_email()` to use SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    - Add better error handling and logging
  
  2. Environment Variables
    - SUPABASE_URL: Available in database environment
    - SUPABASE_SERVICE_ROLE_KEY: Available in database environment
  
  3. Security
    - Functions execute with definer rights to call edge functions
*/

-- Update trigger_autoresponder with correct environment variables
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
BEGIN
  -- Log that trigger fired
  RAISE NOTICE 'Autoresponder trigger fired for email ID: %', NEW.id;

  -- Build function URL using environment variable
  function_url := current_setting('SUPABASE_URL', true) || '/functions/v1/autoresponder';
  
  -- Call the autoresponder edge function asynchronously
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('SUPABASE_SERVICE_ROLE_KEY', true)
    ),
    body := jsonb_build_object('emailId', NEW.id)
  );
  
  RAISE NOTICE 'Autoresponder HTTP request sent for email ID: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the email insert
    RAISE WARNING 'Failed to trigger autoresponder for email ID %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger_process_client_email with correct environment variables
CREATE OR REPLACE FUNCTION trigger_process_client_email()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  email_from TEXT;
  email_subject TEXT;
  email_body TEXT;
BEGIN
  -- Log that trigger fired
  RAISE NOTICE 'Process client email trigger fired for email ID: %', NEW.id;

  -- Extract email data
  email_from := NEW.sender;
  email_subject := NEW.subject;
  email_body := NEW.body;

  -- Build function URL using environment variable
  function_url := current_setting('SUPABASE_URL', true) || '/functions/v1/process-client-email';

  -- Call the process-client-email edge function asynchronously
  PERFORM net.http_post(
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
    )
  );
  
  RAISE NOTICE 'Process client email HTTP request sent for email ID: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the email insert
    RAISE WARNING 'Failed to trigger client email processing for email ID %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;