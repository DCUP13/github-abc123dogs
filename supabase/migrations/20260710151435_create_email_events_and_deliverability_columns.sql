-- Create email_events audit log
CREATE TABLE IF NOT EXISTS email_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       text NOT NULL UNIQUE,  -- SNS MessageId; deduplicates Lambda retries
  email_sent_id  uuid REFERENCES email_sent(id) ON DELETE SET NULL,
  message_id     text,
  event_type     text NOT NULL,
  recipient      text,
  event_time     timestamptz,
  raw_event      jsonb,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Drop the previously applied policy that ran against a non-existent table
-- (no-op if it failed silently, safe to re-create)
DROP POLICY IF EXISTS "select_own_email_events" ON email_events;

CREATE POLICY "select_own_email_events" ON email_events FOR SELECT
  TO authenticated
  USING (
    email_sent_id IN (
      SELECT id FROM email_sent WHERE user_id = auth.uid()
    )
  );

-- Add deliverability tracking columns to email_sent
ALTER TABLE email_sent
  ADD COLUMN IF NOT EXISTS delivery_status   text,
  ADD COLUMN IF NOT EXISTS delivered_at      timestamptz,
  ADD COLUMN IF NOT EXISTS bounced_at        timestamptz,
  ADD COLUMN IF NOT EXISTS bounce_reason     text,
  ADD COLUMN IF NOT EXISTS complained_at     timestamptz,
  ADD COLUMN IF NOT EXISTS complaint_reason  text,
  ADD COLUMN IF NOT EXISTS opened_at         timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at        timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason    text;

CREATE INDEX IF NOT EXISTS email_events_email_sent_id_idx ON email_events(email_sent_id);
CREATE INDEX IF NOT EXISTS email_events_event_type_idx    ON email_events(event_type);
CREATE INDEX IF NOT EXISTS email_sent_message_id_idx      ON email_sent(message_id);
