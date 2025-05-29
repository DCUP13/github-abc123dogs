-- Add is_locked column to amazon_ses_emails table
ALTER TABLE public.amazon_ses_emails
ADD COLUMN is_locked boolean NOT NULL DEFAULT false;

-- Add is_locked column to google_smtp_emails table
ALTER TABLE public.google_smtp_emails
ADD COLUMN is_locked boolean NOT NULL DEFAULT false;

-- Create function to update is_locked status
CREATE OR REPLACE FUNCTION update_email_lock_status()
RETURNS trigger AS $$
BEGIN
  NEW.is_locked := NEW.sent_emails >= NEW.daily_limit;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update is_locked status
CREATE TRIGGER amazon_ses_emails_lock_status
  BEFORE INSERT OR UPDATE ON public.amazon_ses_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_email_lock_status();

CREATE TRIGGER google_smtp_emails_lock_status
  BEFORE INSERT OR UPDATE ON public.google_smtp_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_email_lock_status();

-- Update reset_sent_emails function to also reset is_locked
CREATE OR REPLACE FUNCTION reset_sent_emails()
RETURNS void AS $$
BEGIN
  UPDATE public.amazon_ses_emails SET sent_emails = 0, is_locked = false;
  UPDATE public.google_smtp_emails SET sent_emails = 0, is_locked = false;
END;
$$ LANGUAGE plpgsql;