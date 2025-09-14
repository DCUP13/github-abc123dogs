/*
  # Fix autoresponder trigger to call correct edge function

  1. Updates
    - Fix the trigger function to call the correct edge function name 'autoresponder'
    - Update the function to use the proper Supabase function URL format
    - Add better error handling and logging
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create the corrected trigger function
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
BEGIN
  -- Log that the trigger fired
  RAISE LOG 'AUTORESPONDER TRIGGER FIRED! Email ID: %, From: %, To: %', 
    NEW.id, NEW.sender, NEW.receiver;

  -- Call the autoresponder edge function with correct name
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/autoresponder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'emailId', NEW.id
      )
    );

  RAISE LOG 'Autoresponder function call completed for email ID: %', NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors but don't fail the email insert
    RAISE LOG 'Autoresponder trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();

-- Test the trigger with a sample email
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
  'test@example.com', 
  ARRAY['autoresponder-test@yourdomain.com'], 
  'Test Autoresponder Trigger', 
  'This is a test email to verify the autoresponder trigger is working with the correct edge function name.'
);