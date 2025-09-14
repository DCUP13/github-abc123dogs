/*
  # Fix autoresponder trigger

  1. Updates
    - Drop existing trigger if it exists
    - Create new trigger function that properly calls the autoresponder edge function
    - Add proper error handling and logging
    - Use correct Supabase function URL format

  2. Security
    - Function executes with definer rights to access edge functions
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_email_received ON public.emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create the trigger function
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  function_url text;
  response_status int;
BEGIN
  -- Get Supabase configuration
  SELECT current_setting('app.supabase_url', true) INTO supabase_url;
  SELECT current_setting('app.supabase_service_role_key', true) INTO service_role_key;
  
  -- If settings are not available, try environment variables
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := current_setting('SUPABASE_URL', true);
  END IF;
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := current_setting('SUPABASE_SERVICE_ROLE_KEY', true);
  END IF;
  
  -- Build the function URL
  function_url := supabase_url || '/functions/v1/autoresponder';
  
  -- Log the attempt
  RAISE LOG 'Triggering autoresponder for email ID: %', NEW.id;
  RAISE LOG 'Function URL: %', function_url;
  
  -- Call the autoresponder function asynchronously
  BEGIN
    SELECT status INTO response_status
    FROM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object('emailId', NEW.id)
    );
    
    RAISE LOG 'Autoresponder function called with status: %', response_status;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the email insert
    RAISE LOG 'Autoresponder function call failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();