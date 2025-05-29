-- Create statistics table
CREATE TABLE public.dashboard_statistics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_emails_remaining integer NOT NULL DEFAULT 0,
  total_email_accounts integer NOT NULL DEFAULT 0,
  total_emails_sent_today integer NOT NULL DEFAULT 0,
  total_templates integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id)
);

-- Add RLS policies
ALTER TABLE public.dashboard_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own statistics"
  ON public.dashboard_statistics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update dashboard statistics
CREATE OR REPLACE FUNCTION update_dashboard_statistics(user_uuid uuid)
RETURNS void AS $$
DECLARE
  remaining integer;
  accounts integer;
  sent integer;
  templates integer;
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

  -- Update or insert statistics
  INSERT INTO dashboard_statistics (
    user_id,
    total_emails_remaining,
    total_email_accounts,
    total_emails_sent_today,
    total_templates,
    updated_at
  )
  VALUES (
    user_uuid,
    remaining,
    accounts,
    sent,
    templates,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_emails_remaining = EXCLUDED.total_emails_remaining,
    total_email_accounts = EXCLUDED.total_email_accounts,
    total_emails_sent_today = EXCLUDED.total_emails_sent_today,
    total_templates = EXCLUDED.total_templates,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update statistics when related tables change
CREATE OR REPLACE FUNCTION trigger_update_statistics()
RETURNS trigger AS $$
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

CREATE TRIGGER update_stats_amazon_ses
AFTER INSERT OR UPDATE OR DELETE ON amazon_ses_emails
FOR EACH ROW EXECUTE FUNCTION trigger_update_statistics();

CREATE TRIGGER update_stats_google_smtp
AFTER INSERT OR UPDATE OR DELETE ON google_smtp_emails
FOR EACH ROW EXECUTE FUNCTION trigger_update_statistics();

CREATE TRIGGER update_stats_templates
AFTER INSERT OR UPDATE OR DELETE ON templates
FOR EACH ROW EXECUTE FUNCTION trigger_update_statistics();