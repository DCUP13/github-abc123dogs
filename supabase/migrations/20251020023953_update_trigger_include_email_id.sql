/*
  # Update trigger to pass email ID for reply tracking

  ## Changes
  - Update `trigger_process_client_email()` to include email ID in the payload
  - This allows the process-client-email function to track replies to sent emails
*/

-- Update trigger_process_client_email to include email ID
CREATE OR REPLACE FUNCTION trigger_process_client_email()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  supabase_key TEXT;
BEGIN
  -- Get configuration from system_config table
  SELECT 
    (config->>'supabase_url'),
    (config->>'supabase_service_role_key')
  INTO 
    function_url,
    supabase_key
  FROM system_config 
  WHERE id = 1;
  
  IF function_url IS NULL OR supabase_key IS NULL THEN
    RAISE WARNING 'Missing configuration in system_config table';
    RETURN NEW;
  END IF;
  
  function_url := function_url || '/functions/v1/process-client-email';
  
  -- Call the process-client-email edge function asynchronously with email ID
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_key
    ),
    body := jsonb_build_object(
      'id', NEW.id,
      'from', NEW.sender,
      'subject', NEW.subject,
      'body', NEW.body,
      'received_at', NEW.created_at
    ),
    timeout_milliseconds := 5000
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to call process-client-email function: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;