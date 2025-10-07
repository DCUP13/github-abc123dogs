/*
  # Add client email processing trigger

  1. Updates
    - Modify `trigger_autoresponder()` function to also call `process-client-email` edge function
    - This will automatically update client interaction history when emails are received from CRM clients
    - The process-client-email function will:
      * Match incoming email with CRM client by email address
      * Use AI to generate interaction notes
      * Create interaction record in client_interactions table
      * Update client grade based on new information
  
  2. Security
    - Function executes with definer rights to call edge functions
    - Edge functions handle their own authentication and authorization
*/

-- Update function to trigger both autoresponder and client email processing
CREATE OR REPLACE FUNCTION trigger_autoresponder()
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

  -- Call the autoresponder edge function asynchronously
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/autoresponder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('emailId', NEW.id)
  );

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
    RAISE WARNING 'Failed to trigger email processing: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;