-- Add trigger for campaigns table
CREATE TRIGGER update_stats_campaigns
AFTER INSERT OR UPDATE OR DELETE ON campaigns
FOR EACH ROW EXECUTE FUNCTION trigger_update_statistics();