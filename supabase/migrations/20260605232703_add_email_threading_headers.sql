-- Add Message-ID storage to incoming emails table
ALTER TABLE emails ADD COLUMN IF NOT EXISTS message_id text;

-- Add threading columns to email_outbox
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS message_id text;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS in_reply_to text;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS email_references text;

-- Add threading columns to email_sent (mirrors what was sent)
ALTER TABLE email_sent ADD COLUMN IF NOT EXISTS message_id text;
ALTER TABLE email_sent ADD COLUMN IF NOT EXISTS in_reply_to text;
ALTER TABLE email_sent ADD COLUMN IF NOT EXISTS email_references text;
