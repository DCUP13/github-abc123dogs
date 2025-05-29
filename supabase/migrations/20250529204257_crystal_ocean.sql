-- Add total_campaigns column to dashboard_statistics table
ALTER TABLE public.dashboard_statistics
ADD COLUMN total_campaigns integer NOT NULL DEFAULT 0;

-- Update the update_dashboard_statistics function to include campaigns count
CREATE OR REPLACE FUNCTION update_dashboard_statistics(user_uuid uuid)
RETURNS void AS $$
DECLARE
  remaining integer;
  accounts integer;
  sent integer;
  templates integer;
  campaigns integer;
BEGIN
  -- Calculate total emails remaining
  SELECT COALESCE(SUM(daily_limit - sent_emails), 0)
  INTO remaining
  FROM (
    SELECT daily_limit, sent_emails FROM amazon_ses_emails WHERE user_id = user_uuid
    UNION ALL
    SELECT daily_limit, sent_emails FROM google_smtp_emails WHERE user_id = user_uuid
  ) AS all_emails;

  -- Count total email accounts
  SELECT COUNT(*)
  INTO accounts
  FROM (
    SELECT id FROM amazon_ses_emails WHERE user_id = user_uuid
    UNION ALL
    SELECT id FROM google_smtp_emails WHERE user_id = user_uuid
  ) AS all_accounts;

  -- Calculate total emails sent today
  SELECT COALESCE(SUM(sent_emails), 0)
  INTO sent
  FROM (
    SELECT sent_emails FROM amazon_ses_emails WHERE user_id = user_uuid
    UNION ALL
    SELECT sent_emails FROM google_smtp_emails WHERE user_id = user_uuid
  ) AS all_sent;

  -- Count total templates
  SELECT COUNT(*)
  INTO templates
  FROM templates
  WHERE user_id = user_uuid;

  -- Count total campaigns
  SELECT COUNT(*)
  INTO campaigns
  FROM campaigns
  WHERE user_id = user_uuid;

  -- Update or insert statistics
  INSERT INTO dashboard_statistics (
    user_id,
    total_emails_remaining,
    total_email_accounts,
    total_emails_sent_today,
    total_templates,
    total_campaigns,
    updated_at
  )
  VALUES (
    user_uuid,
    remaining,
    accounts,
    sent,
    templates,
    campaigns,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_emails_remaining = EXCLUDED.total_emails_remaining,
    total_email_accounts = EXCLUDED.total_email_accounts,
    total_emails_sent_today = EXCLUDED.total_emails_sent_today,
    total_templates = EXCLUDED.total_templates,
    total_campaigns = EXCLUDED.total_campaigns,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;