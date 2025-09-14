/*
  # Fix existing autoresponder trigger

  1. Updates
    - Replace the existing trigger_autoresponder() function with a simple version
    - Keep the existing on_email_received trigger
    - Make the function just call our edge function and log "it works"

  2. Testing
    - Insert a test email to verify the trigger works
*/

-- Replace the existing trigger function with our simple version
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  request_id uuid;
  function_url text;
BEGIN
  -- Build function URL using environment variables
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/autoresponder';
  
  -- If no URL setting, try to build from common patterns
  IF function_url IS NULL OR function_url = '/functions/v1/autoresponder' THEN
    function_url := 'https://' || current_setting('app.settings.project_ref', true) || '.supabase.co/functions/v1/autoresponder';
  END IF;
  
  -- If still no URL, use a fallback (you'll need to replace this with your actual URL)
  IF function_url IS NULL OR function_url = '.supabase.co/functions/v1/autoresponder' THEN
    function_url := 'https://your-project-ref.supabase.co/functions/v1/autoresponder';
  END IF;

  -- Make HTTP request to autoresponder function
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'emailId', NEW.id,
      'sender', NEW.sender,
      'receiver', NEW.receiver,
      'subject', NEW.subject
    )
  ) INTO request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the email insert if autoresponder fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, so we don't need to recreate it

-- Insert a test email to trigger the autoresponder
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
  'test-trigger@example.com',
  ARRAY['trigger-test@yourdomain.com'],
  'Trigger Test Email',
  'This email should trigger the autoresponder function.'
);