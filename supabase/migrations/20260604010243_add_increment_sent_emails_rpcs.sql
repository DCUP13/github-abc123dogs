/*
  # Add increment_sent_emails RPC functions

  1. New Functions
    - `increment_sent_emails_ses(p_address, p_user_id)` — increments sent_emails on amazon_ses_emails,
      returns number of rows updated (1 if found, 0 if not)
    - `increment_sent_emails_smtp(p_address, p_user_id)` — same for google_smtp_emails

  2. Notes
    - The existing triggers on amazon_ses_emails and google_smtp_emails already call
      update_dashboard_statistics(), so incrementing sent_emails here automatically
      refreshes the dashboard stats (emails sent today + emails remaining).
    - Security: SECURITY DEFINER so the edge function (service role) can call these
      without needing direct table UPDATE permission grants.
*/

CREATE OR REPLACE FUNCTION increment_sent_emails_ses(p_address text, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE amazon_ses_emails
  SET sent_emails = sent_emails + 1,
      updated_at  = now()
  WHERE address = p_address
    AND user_id  = p_user_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION increment_sent_emails_smtp(p_address text, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE google_smtp_emails
  SET sent_emails = sent_emails + 1,
      updated_at  = now()
  WHERE address = p_address
    AND user_id  = p_user_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
