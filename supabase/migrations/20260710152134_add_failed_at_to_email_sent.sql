ALTER TABLE email_sent
  ADD COLUMN IF NOT EXISTS failed_at timestamptz;
