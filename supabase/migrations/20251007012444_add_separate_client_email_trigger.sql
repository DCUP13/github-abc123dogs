/*
  # Add separate trigger for client email processing

  1. New Functions
    - `trigger_process_client_email()` - Function that calls the process-client-email edge function
  
  2. New Triggers
    - `on_email_received_process_client` - Trigger that fires after INSERT on emails table
  
  3. Updates
    - Revert `trigger_autoresponder()` to original implementation
    - Create separate trigger for client email processing
  
  4. Security
    - Function executes with definer rights to call edge functions
    - Edge functions handle their own authentication and authorization
*/

-- Revert trigger_autoresponder to original implementation
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the autoresponder edge function asynchronously
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/autoresponder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('emailId', NEW.id)
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the email insert
    RAISE WARNING 'Failed to trigger autoresponder: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new function to trigger client email processing
CREATE OR REPLACE FUNCTION trigger_process_client_email()
RETURNS TRIGGER AS $$
DECLARE
  email_from TEXT;
  email_subject TEXT;
  email_body TEXT;
BEGIN
  -- Extract email data
  email_from := NEW.sender;
  email_subject := NEW.subject;
  email_body := NEW.body;

  -- Call the process-client-email edge function asynchronously
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-client-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object(
      'from', email_from,
      'subject', email_subject,
      'body', email_body,
      'received_at', NEW.created_at
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the email insert
    RAISE WARNING 'Failed to trigger client email processing: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after email insert for client email processing
DROP TRIGGER IF EXISTS on_email_received_process_client ON emails;
CREATE TRIGGER on_email_received_process_client
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_client_email();