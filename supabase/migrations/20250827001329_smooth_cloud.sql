/*
  # Email Outbox and Sent Tables

  1. New Tables
    - `email_outbox`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `to_email` (text, recipient email)
      - `from_email` (text, sender email)
      - `subject` (text, email subject)
      - `body` (text, email body)
      - `reply_to_id` (uuid, optional reference to original email)
      - `attachments` (jsonb, array of attachment info)
      - `status` (text, pending/sending/failed)
      - `error_message` (text, optional error details)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `email_sent`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `to_email` (text, recipient email)
      - `from_email` (text, sender email)
      - `subject` (text, email subject)
      - `body` (text, email body)
      - `reply_to_id` (uuid, optional reference to original email)
      - `attachments` (jsonb, array of attachment info)
      - `sent_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own emails

  3. Indexes
    - Add indexes for user_id and reply_to_id for better performance
*/

-- Create email_outbox table
CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  from_email text NOT NULL,
  subject text,
  body text,
  reply_to_id uuid REFERENCES emails(id) ON DELETE SET NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create email_sent table
CREATE TABLE IF NOT EXISTS email_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  from_email text NOT NULL,
  subject text,
  body text,
  reply_to_id uuid REFERENCES emails(id) ON DELETE SET NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sent ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_outbox_user_id ON email_outbox(user_id);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status);
CREATE INDEX IF NOT EXISTS idx_email_outbox_reply_to_id ON email_outbox(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_email_sent_user_id ON email_sent(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sent_reply_to_id ON email_sent(reply_to_id);

-- RLS Policies for email_outbox
CREATE POLICY "Users can read own outbox emails"
  ON email_outbox
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outbox emails"
  ON email_outbox
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outbox emails"
  ON email_outbox
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own outbox emails"
  ON email_outbox
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for email_sent
CREATE POLICY "Users can read own sent emails"
  ON email_sent
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sent emails"
  ON email_sent
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE email_outbox;
ALTER PUBLICATION supabase_realtime ADD TABLE email_sent;