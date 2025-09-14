/*
  # Create autoresponder trigger for emails

  This migration creates a trigger that automatically calls the autoresponder edge function
  whenever a new email is inserted into the emails table.

  BEFORE RUNNING: Replace the following placeholders with your actual values:
  - your-project-ref: Your Supabase project reference (e.g., abcdefghijklmnop)
  - your-service-role-key: Your Supabase service role key (starts with eyJ...)

  1. Functions
    - `trigger_autoresponder()` - Calls the autoresponder edge function via HTTP

  2. Triggers
    - `on_email_received` - Fires after email insert to call autoresponder

  3. Security
    - Uses service role key for authentication
    - Logs all activity for debugging
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
    http_request_id bigint;
    response_data jsonb;
BEGIN
    -- Log that the trigger fired
    RAISE NOTICE 'AUTORESPONDER TRIGGER: Email received from % with subject "%"', NEW.sender, NEW.subject;
    
    BEGIN
        -- Make HTTP request to autoresponder function
        SELECT INTO http_request_id, response_data
            net.http_post(
                url := 'https://your-project-ref.supabase.co/functions/v1/autoresponder',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer your-service-role-key'
                ),
                body := jsonb_build_object(
                    'email_id', NEW.id,
                    'sender', NEW.sender,
                    'subject', NEW.subject,
                    'body', NEW.body,
                    'receiver', NEW.receiver,
                    'created_at', NEW.created_at
                )
            );
        
        -- Log success
        RAISE NOTICE 'AUTORESPONDER TRIGGER: HTTP request completed with ID: %', http_request_id;
        RAISE NOTICE 'AUTORESPONDER TRIGGER: Response: %', response_data;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the email insert
        RAISE NOTICE 'AUTORESPONDER TRIGGER: HTTP request failed - %', SQLERRM;
    END;
    
    -- Always return NEW to complete the insert
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_email_received
    AFTER INSERT ON emails
    FOR EACH ROW
    EXECUTE FUNCTION trigger_autoresponder();

-- Log that setup is complete
DO $$
BEGIN
    RAISE NOTICE 'AUTORESPONDER SETUP: Trigger and function created successfully';
END $$;

-- Insert a test email to verify the trigger works
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
    'trigger-test@example.com',
    ARRAY['test-recipient@example.com'],
    'Trigger Test Email',
    'This email was inserted to test the autoresponder trigger.'
);