ALTER TABLE email_sent ADD COLUMN IF NOT EXISTS ses_message_id text;
CREATE INDEX IF NOT EXISTS email_sent_ses_message_id_idx ON email_sent(ses_message_id);
