/*
  # Fix client grading trigger for updates

  1. Updates
    - Modify trigger to fire on both INSERT and UPDATE operations
    - Add logic to only grade clients when no existing grades are found
    - Ensure edge function is called for client updates when grades don't exist

  2. Security
    - Maintains existing security model
    - Function executes with definer rights to call edge functions
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_client_created ON clients;
DROP TRIGGER IF EXISTS on_client_created_or_updated ON clients;
DROP FUNCTION IF EXISTS trigger_client_grading();
DROP FUNCTION IF EXISTS trigger_client_grading_wrapper();

-- Create updated trigger function that handles both INSERT and UPDATE
CREATE OR REPLACE FUNCTION trigger_client_grading()
RETURNS TRIGGER AS $$
DECLARE
  existing_grade_count integer;
BEGIN
  -- Check if grades already exist for this client
  SELECT COUNT(*) INTO existing_grade_count
  FROM client_grades
  WHERE client_id = NEW.id;
  
  -- Only call grading function if no grades exist
  IF existing_grade_count = 0 THEN
    -- Call the grade-client edge function asynchronously
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/grade-client',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'client_id', NEW.id,
        'user_id', NEW.user_id,
        'client_data', row_to_json(NEW)
      )
    );
    
    RAISE LOG 'Client grading triggered for client ID: % (no existing grades)', NEW.id;
  ELSE
    RAISE LOG 'Client grading skipped for client ID: % (grades already exist)', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the client operation
    RAISE WARNING 'Client grading trigger failed for client %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires on both INSERT and UPDATE
CREATE TRIGGER on_client_created_or_updated
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_client_grading();

-- Log that the trigger was updated
DO $$
BEGIN
  RAISE NOTICE 'Client grading trigger updated to handle both INSERT and UPDATE operations';
END $$;