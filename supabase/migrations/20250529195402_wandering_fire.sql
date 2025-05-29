-- Add sent_emails column to amazon_ses_emails table
ALTER TABLE public.amazon_ses_emails
ADD COLUMN sent_emails integer NOT NULL DEFAULT 0;

-- Add sent_emails column to google_smtp_emails table
ALTER TABLE public.google_smtp_emails
ADD COLUMN sent_emails integer NOT NULL DEFAULT 0;

-- Add check constraints to ensure sent_emails doesn't exceed daily_limit
ALTER TABLE public.amazon_ses_emails
ADD CONSTRAINT amazon_ses_emails_sent_emails_check 
CHECK (sent_emails >= 0 AND sent_emails <= daily_limit);

ALTER TABLE public.google_smtp_emails
ADD CONSTRAINT google_smtp_emails_sent_emails_check 
CHECK (sent_emails >= 0 AND sent_emails <= daily_limit);

-- Add indexes for better query performance
CREATE INDEX idx_amazon_ses_emails_sent_emails 
ON public.amazon_ses_emails (sent_emails);

CREATE INDEX idx_google_smtp_emails_sent_emails 
ON public.google_smtp_emails (sent_emails);

-- Add function to reset sent_emails count at midnight UTC
CREATE OR REPLACE FUNCTION reset_sent_emails()
RETURNS void AS $$
BEGIN
  UPDATE public.amazon_ses_emails SET sent_emails = 0;
  UPDATE public.google_smtp_emails SET sent_emails = 0;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to reset sent_emails daily
-- Note: This requires pg_cron extension to be enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'reset-sent-emails',
  '0 0 * * *',  -- Run at midnight UTC
  $$SELECT reset_sent_emails()$$
);