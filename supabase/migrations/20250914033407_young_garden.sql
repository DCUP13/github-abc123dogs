/*
  # Create autoresponder trigger

  1. New Functions
    - `trigger_autoresponder()` - Calls the autoresponder edge function when emails are received

  2. New Triggers
    - `on_email_received` - Fires after INSERT on emails table

  3. Test Data
    - Inserts a test email to verify the trigger works

  IMPORTANT: Replace the following placeholders before running:
  - your-project-ref → your actual Supabase project reference
  - your-service-role-key → your actual service role key
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create the autoresponder trigger function
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the autoresponder edge function
  PERFORM net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/autoresponder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer your-service-role-key'
    ),
    body := jsonb_build_object(
      'email_id', NEW.id,
      'sender', NEW.sender,
      'receiver', NEW.receiver,
      'subject', NEW.subject,
      'body', NEW.body,
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();

-- Insert a test email to verify the trigger works
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
  'trigger-test@example.com',
  ARRAY['test-recipient@example.com'],
  'Trigger Test Email',
  'This email was inserted to test the autoresponder trigger.'
);