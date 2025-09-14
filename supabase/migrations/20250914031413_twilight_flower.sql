/*
  # Create autoresponder trigger function and trigger

  1. New Functions
    - `trigger_autoresponder()` - PL/pgSQL function that calls the autoresponder edge function
  
  2. New Triggers
    - `on_email_received` - Fires after INSERT on emails table
  
  3. Test
    - Inserts a test email to immediately trigger the autoresponder
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
    function_url text;
    service_role_key text;
BEGIN
    -- Log that trigger fired
    RAISE NOTICE 'AUTORESPONDER TRIGGER FIRED! Email ID: %, Sender: %, Subject: %', 
        NEW.id, NEW.sender, COALESCE(NEW.subject, '(no subject)');
    
    -- Get the function URL (replace your-project-ref with actual project reference)
    function_url := 'https://your-project-ref.supabase.co/functions/v1/autoresponder';
    
    -- Get service role key from environment
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- Log the URL we're calling
    RAISE NOTICE 'Calling autoresponder at URL: %', function_url;
    
    BEGIN
        -- Make HTTP request to edge function
        SELECT INTO http_request_id
            net.http_post(
                url := function_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || COALESCE(service_role_key, 'your-service-role-key')
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
        
        RAISE NOTICE 'HTTP request completed with ID: %', http_request_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'HTTP request failed: %', SQLERRM;
    END;
    
    RAISE NOTICE 'AUTORESPONDER TRIGGER COMPLETED for email ID: %', NEW.id;
    
    -- Always return NEW to allow the insert to complete
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_email_received
    AFTER INSERT ON emails
    FOR EACH ROW
    EXECUTE FUNCTION trigger_autoresponder();

-- Test the trigger by inserting an email
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
    'trigger-test@example.com',
    ARRAY['recipient@example.com'],
    'Trigger Test Email',
    'This email should trigger the autoresponder function.'
);

RAISE NOTICE 'Test email inserted - check logs for trigger execution!';