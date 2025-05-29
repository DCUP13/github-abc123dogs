-- Drop existing trigger function
DROP FUNCTION IF EXISTS trigger_update_statistics() CASCADE;

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION trigger_update_statistics()
RETURNS trigger 
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
  PERFORM update_dashboard_statistics(
    CASE 
      WHEN TG_TABLE_NAME = 'templates' THEN NEW.user_id
      ELSE
        CASE 
          WHEN TG_OP = 'DELETE' THEN OLD.user_id
          ELSE NEW.user_id
        END
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers
CREATE TRIGGER update_stats_amazon_ses
AFTER INSERT OR UPDATE OR DELETE ON amazon_ses_emails
FOR EACH ROW EXECUTE FUNCTION trigger_update_statistics();

CREATE TRIGGER update_stats_google_smtp
AFTER INSERT OR UPDATE OR DELETE ON google_smtp_emails
FOR EACH ROW EXECUTE FUNCTION trigger_update_statistics();

CREATE TRIGGER update_stats_templates
AFTER INSERT OR UPDATE OR DELETE ON templates
FOR EACH ROW EXECUTE FUNCTION trigger_update_statistics();