/*
  # Simple Client Grading Trigger

  1. Changes
    - Drop existing client grading trigger
    - Create new trigger that fires on ANY INSERT or UPDATE to clients table
    - Simplified trigger function that always calls the grading edge function

  2. Trigger Behavior
    - Fires on both INSERT and UPDATE operations
    - No field-specific conditions - triggers on any change
    - Calls grade-client edge function for every trigger event
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_client_created_or_updated ON clients;

-- Drop existing trigger function if it exists
DROP FUNCTION IF EXISTS trigger_client_grading();

-- Create new simplified trigger function
CREATE OR REPLACE FUNCTION trigger_client_grading()
RETURNS TRIGGER AS $$
DECLARE
  client_data jsonb;
BEGIN
  -- Use NEW record for both INSERT and UPDATE
  client_data := to_jsonb(NEW);
  
  -- Log the trigger execution
  RAISE LOG 'Client grading trigger fired for client: % %', NEW.first_name, NEW.last_name;
  
  -- Call the edge function asynchronously
  BEGIN
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/grade-client',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'client_id', NEW.id,
          'user_id', NEW.user_id,
          'client_data', client_data
        )
      );
    
    RAISE LOG 'Successfully called grade-client function for client: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the client operation
    RAISE LOG 'Error calling grade-client function: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_client_created_or_updated
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_client_grading();