-- Drop and recreate trigger function with proper RETURNING clause
CREATE OR REPLACE FUNCTION trigger_update_statistics()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM update_dashboard_statistics(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.user_id
      ELSE NEW.user_id
    END
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with proper timing
DROP TRIGGER IF EXISTS update_stats_amazon_ses ON amazon_ses_emails;
DROP TRIGGER IF EXISTS update_stats_google_smtp ON google_smtp_emails;
DROP TRIGGER IF EXISTS update_stats_templates ON templates;
DROP TRIGGER IF EXISTS update_stats_campaigns ON campaigns;

CREATE TRIGGER update_stats_amazon_ses
AFTER INSERT OR UPDATE OR DELETE ON amazon_ses_emails
FOR EACH ROW EXECUTE FUNCTION trigger_update_statistics();

CREATE TRIGGER update_stats_google_smtp
AFTER INSERT OR UPDATE OR DELETE ON google_smtp_emails
FOR EACH ROW EXECUTE FUNCTION trigger_update_statistics();

CREATE TRIGGER update_stats_templates
AFTER INSERT OR UPDATE OR DELETE ON templates
FOR EACH ROW EXECUTE FUNCTION trigger_update_statistics();

CREATE TRIGGER update_stats_campaigns
AFTER INSERT OR UPDATE OR DELETE ON campaigns
FOR EACH ROW EXECUTE FUNCTION trigger_update_statistics();

-- Enable realtime for dashboard_statistics table
ALTER PUBLICATION supabase_realtime ADD TABLE dashboard_statistics;