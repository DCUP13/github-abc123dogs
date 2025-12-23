/*
  # Fix Autoresponder Trigger JSON Body

  1. Changes
    - Update `trigger_autoresponder()` function to properly serialize JSON body
    - Convert jsonb_build_object to a text-based JSON string that pg_net can handle correctly
    
  2. Issue Fixed
    - pg_net's http_post has issues with jsonb_build_object() for the body parameter
    - The body needs to be formatted as a properly quoted JSON string
    
  3. Solution
    - Build JSON body as text with proper formatting
    - Cast to jsonb for the http_post function
*/

CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  service_key text;
  request_id bigint;
  json_body jsonb;
BEGIN
  -- Log that trigger fired
  RAISE NOTICE 'Autoresponder trigger fired for email ID: %', NEW.id;

  -- Get configuration from system_config table
  SELECT value INTO function_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO service_key FROM system_config WHERE key = 'supabase_service_role_key';
  
  IF function_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Supabase configuration not found in system_config table';
    RETURN NEW;
  END IF;
  
  function_url := function_url || '/functions/v1/autoresponder';
  
  -- Build JSON body as a proper JSON string
  json_body := format('{"emailId": "%s"}', NEW.id)::jsonb;
  
  -- Call the autoresponder edge function asynchronously
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := format('{"Content-Type": "application/json", "Authorization": "Bearer %s"}', service_key)::jsonb,
      body := json_body,
      timeout_milliseconds := 30000
    ) INTO request_id;
    
    RAISE NOTICE 'Autoresponder HTTP request sent with ID: %, body: %', request_id, json_body::text;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to trigger autoresponder for email ID %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;