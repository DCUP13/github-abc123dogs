/*
  # Add Email Reply and Response Tracking

  ## Overview
  This migration adds functionality to track replies and responses for sent emails.

  ## New Tables

  ### email_replies
  Tracks individual replies received for sent emails:
  - `id` (uuid, primary key) - Unique identifier for the reply
  - `user_id` (uuid, foreign key to profiles) - Owner of the original sent email
  - `sent_email_id` (uuid, foreign key to email_sent) - Reference to the original sent email
  - `received_email_id` (uuid, foreign key to emails) - Reference to the received reply email
  - `from_email` (text) - Email address of the person who replied
  - `subject` (text) - Subject of the reply
  - `created_at` (timestamp) - When the reply was received

  ## Modified Tables

  ### email_sent
  Added columns:
  - `reply_count` (integer, default 0) - Number of replies received for this email
  - `last_reply_at` (timestamp, nullable) - Timestamp of the most recent reply

  ## Security
  - Enable RLS on email_replies table
  - Add policies for authenticated users to manage their own email replies
  - Users can only see replies for their own sent emails

  ## Indexes
  - Add indexes on sent_email_id and received_email_id for better query performance
  - Add index on user_id for filtering
*/

-- Add reply tracking columns to email_sent table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_sent' AND column_name = 'reply_count'
  ) THEN
    ALTER TABLE email_sent ADD COLUMN reply_count integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_sent' AND column_name = 'last_reply_at'
  ) THEN
    ALTER TABLE email_sent ADD COLUMN last_reply_at timestamptz;
  END IF;
END $$;

-- Create email_replies table to track individual replies
CREATE TABLE IF NOT EXISTS email_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sent_email_id uuid NOT NULL REFERENCES email_sent(id) ON DELETE CASCADE,
  received_email_id uuid NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  from_email text NOT NULL,
  subject text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on email_replies
ALTER TABLE email_replies ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_replies_user_id ON email_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_sent_email_id ON email_replies(sent_email_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_received_email_id ON email_replies(received_email_id);
CREATE INDEX IF NOT EXISTS idx_email_sent_reply_count ON email_sent(reply_count);

-- RLS Policies for email_replies
CREATE POLICY "Users can read own email replies"
  ON email_replies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email replies"
  ON email_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own email replies"
  ON email_replies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update reply count on email_sent table
CREATE OR REPLACE FUNCTION update_email_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE email_sent
    SET
      reply_count = reply_count + 1,
      last_reply_at = NEW.created_at
    WHERE id = NEW.sent_email_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE email_sent
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.sent_email_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update reply count
CREATE TRIGGER update_reply_count_trigger
  AFTER INSERT OR DELETE ON email_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_email_reply_count();

-- Add realtime subscription for email_replies
ALTER PUBLICATION supabase_realtime ADD TABLE email_replies;
