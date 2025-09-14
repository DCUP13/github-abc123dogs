/*
  # Replace autoresponder trigger with reliable implementation

  1. Changes
    - Drop existing trigger and function if they exist
    - Create new simplified trigger function
    - Add new trigger that fires on email insert
    - Add basic logging to verify trigger execution

  2. Security
    - Function executes with definer rights
    - Uses service role key for edge function calls
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create a simple trigger function that logs and calls autoresponder
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
BEGIN
  -- Log that the trigger fired
  RAISE LOG 'Autoresponder trigger fired for email ID: %', NEW.id;
  
  -- Try to call the autoresponder function
  BEGIN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/autoresponder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := jsonb_build_object('emailId', NEW.id)
    );
    
    RAISE LOG 'Autoresponder function called successfully for email: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Autoresponder function call failed for email %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();

-- Log that the trigger was created
DO $$
BEGIN
  RAISE LOG 'Autoresponder trigger created successfully';
END $$;