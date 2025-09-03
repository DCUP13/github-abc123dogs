/*
  # Add domains tracking to dashboard statistics

  1. Schema Changes
    - Add `total_domains` column to `dashboard_statistics` table
    - Set default value to 0

  2. Triggers
    - Update trigger on `amazon_ses_domains` table to update domain count
    - Function to recalculate domain statistics

  3. Data Migration
    - Update existing records with current domain counts
*/

-- Add total_domains column to dashboard_statistics
ALTER TABLE dashboard_statistics 
ADD COLUMN IF NOT EXISTS total_domains integer DEFAULT 0 NOT NULL;

-- Create function to update domain statistics
CREATE OR REPLACE FUNCTION update_domain_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update domain counts for all users
  UPDATE dashboard_statistics 
  SET total_domains = (
    SELECT COUNT(*)
    FROM amazon_ses_domains 
    WHERE amazon_ses_domains.user_id = dashboard_statistics.user_id
  ),
  updated_at = now();
  
  -- Insert missing statistics records for users who have domains but no stats
  INSERT INTO dashboard_statistics (user_id, total_domains, updated_at)
  SELECT DISTINCT user_id, 0, now()
  FROM amazon_ses_domains
  WHERE user_id NOT IN (SELECT user_id FROM dashboard_statistics WHERE user_id IS NOT NULL)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update the newly inserted records
  UPDATE dashboard_statistics 
  SET total_domains = (
    SELECT COUNT(*)
    FROM amazon_ses_domains 
    WHERE amazon_ses_domains.user_id = dashboard_statistics.user_id
  ),
  updated_at = now()
  WHERE total_domains = 0;
END;
$$;

-- Create trigger function for amazon_ses_domains changes
CREATE OR REPLACE FUNCTION trigger_update_domain_statistics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Determine which user_id to update
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;
  
  -- Ensure user has a statistics record
  INSERT INTO dashboard_statistics (user_id, total_domains, updated_at)
  VALUES (target_user_id, 0, now())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update the domain count for this user
  UPDATE dashboard_statistics 
  SET total_domains = (
    SELECT COUNT(*)
    FROM amazon_ses_domains 
    WHERE user_id = target_user_id
  ),
  updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on amazon_ses_domains table
DROP TRIGGER IF EXISTS update_stats_domains ON amazon_ses_domains;
CREATE TRIGGER update_stats_domains
  AFTER INSERT OR UPDATE OR DELETE ON amazon_ses_domains
  FOR EACH ROW EXECUTE FUNCTION trigger_update_domain_statistics();

-- Update existing statistics with current domain counts
SELECT update_domain_statistics();