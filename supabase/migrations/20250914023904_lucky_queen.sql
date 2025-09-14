/*
  # Fix autoresponder trigger using existing pattern

  1. Function Updates
    - Drop and recreate trigger_autoresponder function
    - Use the same pattern as other working triggers in the system
    - Add proper logging and error handling

  2. Trigger Updates  
    - Drop and recreate the on_email_received trigger
    - Use AFTER INSERT pattern like other triggers
    - Ensure it fires for each row

  3. Testing
    - Insert test email to verify trigger fires
    - Check database logs for trigger execution
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create the trigger function using the same pattern as other functions
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
    function_url text;
    payload jsonb;
    response_id bigint;
BEGIN
    -- Log that the trigger fired
    RAISE NOTICE 'AUTORESPONDER TRIGGER FIRED! Email ID: %, From: %, To: %', 
        NEW.id, NEW.sender, array_to_string(NEW.receiver, ', ');

    -- Get the Supabase URL from settings
    SELECT current_setting('app.settings.supabase_url', true) INTO function_url;
    
    -- If not set, use default pattern
    IF function_url IS NULL OR function_url = '' THEN
        function_url := 'https://your-project.supabase.co';
        RAISE NOTICE 'Using default Supabase URL pattern';
    END IF;
    
    -- Construct the full function URL
    function_url := function_url || '/functions/v1/autoresponder';
    
    RAISE NOTICE 'Calling autoresponder function at: %', function_url;

    -- Prepare the payload
    payload := jsonb_build_object(
        'emailId', NEW.id,
        'sender', NEW.sender,
        'receiver', NEW.receiver,
        'subject', NEW.subject,
        'body', NEW.body,
        'created_at', NEW.created_at
    );

    -- Make the HTTP request using pg_net (if available)
    BEGIN
        -- Try to call the function using pg_net
        SELECT net.http_post(
            url := function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := payload
        ) INTO response_id;
        
        RAISE NOTICE 'HTTP request initiated with ID: %', response_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to call autoresponder function: %', SQLERRM;
        -- Don't fail the email insert, just log the error
    END;

    -- Always return NEW to allow the email insert to succeed
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger using the same pattern as other triggers
CREATE TRIGGER on_email_received
    AFTER INSERT ON emails
    FOR EACH ROW
    EXECUTE FUNCTION trigger_autoresponder();

RAISE NOTICE 'SUCCESS: Autoresponder trigger recreated using existing pattern!';

-- Insert a test email to verify the trigger works
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
    'test-pattern@example.com',
    ARRAY['pattern-test@yourdomain.com'],
    'Test Pattern Trigger',
    'This email tests the autoresponder trigger using the existing pattern.'
);

RAISE NOTICE 'Test email inserted to verify trigger functionality';