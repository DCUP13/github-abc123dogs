/*
  # Investigate existing triggers and recreate autoresponder

  1. Investigation
    - Check what triggers currently exist on emails table
    - Check what trigger functions exist
    - See how existing triggers are implemented
  
  2. Recreate
    - Drop any existing autoresponder trigger/function
    - Create new trigger function following exact pattern of working triggers
    - Create trigger using same syntax as working triggers
  
  3. Test
    - Insert test email to verify trigger fires
*/

-- First, let's see what triggers exist on the emails table
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    RAISE NOTICE 'CHECKING EXISTING TRIGGERS ON EMAILS TABLE:';
    
    FOR trigger_record IN 
        SELECT trigger_name, event_manipulation, action_timing, action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'emails'
    LOOP
        RAISE NOTICE 'Found trigger: % - % % - %', 
            trigger_record.trigger_name, 
            trigger_record.action_timing,
            trigger_record.event_manipulation,
            trigger_record.action_statement;
    END LOOP;
END $$;

-- Check what trigger functions exist
DO $$
DECLARE
    func_record RECORD;
BEGIN
    RAISE NOTICE 'CHECKING EXISTING TRIGGER FUNCTIONS:';
    
    FOR func_record IN 
        SELECT routine_name, routine_definition
        FROM information_schema.routines 
        WHERE routine_type = 'FUNCTION' 
        AND routine_name LIKE '%trigger%'
        OR routine_name LIKE '%autoresponder%'
    LOOP
        RAISE NOTICE 'Found function: %', func_record.routine_name;
    END LOOP;
END $$;

-- Drop existing autoresponder trigger and function if they exist
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create the trigger function using the exact same pattern as other working triggers
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
BEGIN
    -- Log that the trigger fired
    RAISE NOTICE 'AUTORESPONDER TRIGGER FIRED! Email ID: %, From: %, To: %', 
        NEW.id, NEW.sender, array_to_string(NEW.receiver, ', ');
    
    -- Call the autoresponder function asynchronously
    PERFORM pg_net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/autoresponder',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
            'emailId', NEW.id,
            'sender', NEW.sender,
            'receiver', NEW.receiver,
            'subject', NEW.subject,
            'body', NEW.body,
            'created_at', NEW.created_at
        )
    );
    
    RAISE NOTICE 'Autoresponder HTTP request sent for email ID: %', NEW.id;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the email insert
    RAISE NOTICE 'Error in autoresponder trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger using the exact same syntax as existing triggers
CREATE TRIGGER on_email_received
    AFTER INSERT ON emails
    FOR EACH ROW
    EXECUTE FUNCTION trigger_autoresponder();

RAISE NOTICE 'SUCCESS: Autoresponder trigger recreated successfully!';

-- Insert a test email to verify the trigger works
INSERT INTO emails (sender, receiver, subject, body) 
VALUES (
    'test-final@example.com',
    ARRAY['final-test@yourdomain.com'],
    'Final Trigger Test',
    'This is a test to verify the autoresponder trigger is working properly.'
);

RAISE NOTICE 'Test email inserted - check logs for trigger activation!';