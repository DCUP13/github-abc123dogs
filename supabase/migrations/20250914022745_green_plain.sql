/*
  # Recreate autoresponder trigger with direct function call

  1. Database Changes
    - Drop existing trigger and function if they exist
    - Create new trigger function that directly calls autoresponder edge function
    - Create trigger on emails table for INSERT events
    - Insert test email to verify trigger works

  2. Security
    - Function uses SECURITY DEFINER to ensure proper permissions
    - Includes error handling to prevent email insertion failures

  3. Testing
    - Inserts test email after creating trigger
    - Should generate logs in both database and edge function
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create the trigger function that calls the autoresponder edge function
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  response_status int;
  response_content text;
BEGIN
  -- Log that the trigger fired
  RAISE NOTICE 'TRIGGER FIRED! Email ID: %, From: %, To: %', NEW.id, NEW.sender, NEW.receiver;
  
  BEGIN
    -- Call the autoresponder edge function using pg_net
    SELECT status, content INTO response_status, response_content
    FROM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/autoresponder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object('emailId', NEW.id::text)
    );
    
    RAISE NOTICE 'Autoresponder function called. Status: %, Response: %', response_status, response_content;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the email insertion
    RAISE NOTICE 'Error calling autoresponder function: %', SQLERRM;
  END;
  
  -- Always return NEW to allow the email insertion to succeed
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();

RAISE NOTICE 'Trigger created successfully!';

-- Insert a test email to verify the trigger works
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
  'test-direct@example.com',
  ARRAY['direct-test@yourdomain.com'],
  'Direct Trigger Test',
  'This email should trigger the autoresponder function directly.'
);

RAISE NOTICE 'Test email inserted - check logs for trigger execution!';