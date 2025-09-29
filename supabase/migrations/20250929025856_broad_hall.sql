/*
  # Fix client grading trigger with field-specific conditions

  1. Updates
    - Replace the existing client grading trigger function
    - Add field-specific change detection
    - Only trigger when meaningful fields change (not name, email, phone)
    - Check for existing grades before calling edge function

  2. Trigger Logic
    - Fires on INSERT (new clients)
    - Fires on UPDATE only when specific fields change
    - Excludes name, email, phone changes from triggering
    - Only calls grading function if no grades exist

  3. Fields that trigger grading
    - client_type, status, budget_min, budget_max
    - preferred_areas, property_type, notes, source
    - address, city, state, zip_code
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_client_created_or_updated ON clients;
DROP FUNCTION IF EXISTS trigger_client_grading();

-- Create updated trigger function
CREATE OR REPLACE FUNCTION trigger_client_grading()
RETURNS TRIGGER AS $$
DECLARE
  existing_grade_count INTEGER;
  should_grade BOOLEAN := FALSE;
BEGIN
  -- For INSERT operations, always check if we should grade
  IF TG_OP = 'INSERT' THEN
    should_grade := TRUE;
  -- For UPDATE operations, check if relevant fields changed
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if any grading-relevant fields changed (excluding name, email, phone)
    IF (OLD.client_type IS DISTINCT FROM NEW.client_type) OR
       (OLD.status IS DISTINCT FROM NEW.status) OR
       (OLD.budget_min IS DISTINCT FROM NEW.budget_min) OR
       (OLD.budget_max IS DISTINCT FROM NEW.budget_max) OR
       (OLD.preferred_areas IS DISTINCT FROM NEW.preferred_areas) OR
       (OLD.property_type IS DISTINCT FROM NEW.property_type) OR
       (OLD.notes IS DISTINCT FROM NEW.notes) OR
       (OLD.source IS DISTINCT FROM NEW.source) OR
       (OLD.address IS DISTINCT FROM NEW.address) OR
       (OLD.city IS DISTINCT FROM NEW.city) OR
       (OLD.state IS DISTINCT FROM NEW.state) OR
       (OLD.zip_code IS DISTINCT FROM NEW.zip_code) THEN
      should_grade := TRUE;
    END IF;
  END IF;

  -- Only proceed if we should grade
  IF should_grade THEN
    -- Check if grades already exist for this client
    SELECT COUNT(*) INTO existing_grade_count
    FROM client_grades
    WHERE client_id = NEW.id;

    -- Only call grading function if no grades exist
    IF existing_grade_count = 0 THEN
      BEGIN
        -- Call the edge function to grade the client
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
              'client_data', jsonb_build_object(
                'first_name', NEW.first_name,
                'last_name', NEW.last_name,
                'email', NEW.email,
                'phone', NEW.phone,
                'address', NEW.address,
                'city', NEW.city,
                'state', NEW.state,
                'zip_code', NEW.zip_code,
                'client_type', NEW.client_type,
                'status', NEW.status,
                'budget_min', NEW.budget_min,
                'budget_max', NEW.budget_max,
                'preferred_areas', NEW.preferred_areas,
                'property_type', NEW.property_type,
                'notes', NEW.notes,
                'source', NEW.source
              )
            )
          );
        
        RAISE LOG 'Client grading function called for client: % %', NEW.first_name, NEW.last_name;
      EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the client operation
        RAISE LOG 'Error calling client grading function: %', SQLERRM;
      END;
    ELSE
      RAISE LOG 'Skipping grading for client % % - grades already exist', NEW.first_name, NEW.last_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_client_created_or_updated
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_client_grading();