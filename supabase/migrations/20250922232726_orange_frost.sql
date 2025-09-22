/*
  # Remove campaigns and templates related tables

  1. Tables to Remove
    - `campaigns` - Campaign management table
    - `templates` - Template storage table  
    - `campaign_templates` - Junction table linking campaigns to templates
    - `campaign_emails` - Junction table linking campaigns to emails

  2. Statistics Updates
    - Remove campaign and template related columns from dashboard_statistics
    - Update trigger functions to exclude removed tables

  3. Security
    - All RLS policies will be automatically removed with table deletion
*/

-- Remove campaign and template related tables
DROP TABLE IF EXISTS campaign_templates CASCADE;
DROP TABLE IF EXISTS campaign_emails CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS templates CASCADE;

-- Update dashboard_statistics table to remove campaign and template columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dashboard_statistics' AND column_name = 'total_campaigns'
  ) THEN
    ALTER TABLE dashboard_statistics DROP COLUMN total_campaigns;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dashboard_statistics' AND column_name = 'total_templates'
  ) THEN
    ALTER TABLE dashboard_statistics DROP COLUMN total_templates;
  END IF;
END $$;

-- Update the trigger function to exclude removed tables
CREATE OR REPLACE FUNCTION trigger_update_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update statistics for the user
  INSERT INTO dashboard_statistics (user_id, total_emails_remaining, total_email_accounts, total_emails_sent_today, total_domains, updated_at)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(
      (SELECT COALESCE(SUM(daily_limit - sent_emails), 0) 
       FROM amazon_ses_emails 
       WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND NOT is_locked) +
      (SELECT COALESCE(SUM(daily_limit - sent_emails), 0) 
       FROM google_smtp_emails 
       WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND NOT is_locked),
      0
    ),
    COALESCE(
      (SELECT COUNT(*) FROM amazon_ses_emails WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)) +
      (SELECT COUNT(*) FROM google_smtp_emails WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)),
      0
    ),
    COALESCE(
      (SELECT COALESCE(SUM(sent_emails), 0) FROM amazon_ses_emails WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)) +
      (SELECT COALESCE(SUM(sent_emails), 0) FROM google_smtp_emails WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)),
      0
    ),
    0, -- total_domains will be updated by domain-specific trigger
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_emails_remaining = EXCLUDED.total_emails_remaining,
    total_email_accounts = EXCLUDED.total_email_accounts,
    total_emails_sent_today = EXCLUDED.total_emails_sent_today,
    updated_at = EXCLUDED.updated_at;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;