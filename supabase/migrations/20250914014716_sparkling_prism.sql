/*
  # Add autoresponder trigger for incoming emails

  1. New Functions
    - `trigger_autoresponder()` - Function that calls the autoresponder edge function when new emails arrive
  
  2. New Triggers
    - `on_email_received` - Trigger that fires after INSERT on emails table
  
  3. Security
    - Function executes with definer rights to call edge functions
*/

-- Create function to trigger autoresponder
CREATE OR REPLACE FUNCTION trigger_autoresponder()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the autoresponder edge function asynchronously
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/autoresponder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('emailId', NEW.id)
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the email insert
    RAISE WARNING 'Failed to trigger autoresponder: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after email insert
DROP TRIGGER IF EXISTS on_email_received ON emails;
CREATE TRIGGER on_email_received
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION trigger_autoresponder();