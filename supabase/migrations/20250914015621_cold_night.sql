/*
  # Fix autoresponder trigger to properly call edge function

  1. Updates
    - Replace existing trigger function with corrected implementation
    - Fix HTTP request to properly call the autoresponder edge function
    - Add better error handling and logging
    - Use correct Supabase function URL format

  2. Security
    - Maintains existing trigger security model
    - Uses service role for function calls
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_email_received ON emails;
DROP FUNCTION IF EXISTS trigger_autoresponder();

-- Create updated trigger function
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  function_url text;
  response_status int;
  response_body text;
BEGIN
  -- Get Supabase configuration
  SELECT current_setting('app.supabase_url', true) INTO supabase_url;
  SELECT current_setting('app.supabase_service_role_key', true) INTO service_role_key;
  
  -- Fallback to environment variables if settings not found
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := current_setting('SUPABASE_URL', true);
  END IF;
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := current_setting('SUPABASE_SERVICE_ROLE_KEY', true);
  END IF;
  
  -- Log the configuration (for debugging)
  RAISE LOG 'Autoresponder trigger fired for email ID: %', NEW.id;
  RAISE LOG 'Supabase URL: %', COALESCE(supabase_url, 'NOT SET');
  RAISE LOG 'Service role key: %', CASE WHEN service_role_key IS NOT NULL THEN 'SET' ELSE 'NOT SET' END;
  
  -- Only proceed if we have the required configuration
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    -- Construct the function URL
    function_url := supabase_url || '/functions/v1/autoresponder';
    
    RAISE LOG 'Calling autoresponder function at: %', function_url;
    
    -- Call the autoresponder function
    SELECT status, content INTO response_status, response_body
    FROM http((
      'POST',
      function_url,
      ARRAY[
        http_header('Authorization', 'Bearer ' || service_role_key),
        http_header('Content-Type', 'application/json')
      ],
      'application/json',
      json_build_object('emailId', NEW.id)::text
    ));
    
    RAISE LOG 'Autoresponder response status: %, body: %', response_status, response_body;
    
    -- Log success or failure
    IF response_status = 200 THEN
      RAISE LOG 'Autoresponder function called successfully for email %', NEW.id;
    ELSE
      RAISE WARNING 'Autoresponder function failed with status % for email %: %', response_status, NEW.id, response_body;
    END IF;
  ELSE
    RAISE WARNING 'Autoresponder trigger skipped - missing Supabase configuration';
  END IF;
  
  -- Always return NEW to allow the email insert to complete
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent email insertion
    RAISE WARNING 'Autoresponder trigger error for email %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();