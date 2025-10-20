/*
  # Add Reply Tracking to Email Sent Table

  ## Changes
  - Add reply_count column to email_sent table
  - Add last_reply_at column to email_sent table
  - Create email_replies table to track individual replies
  - Add trigger to automatically update reply counts
  - Add indexes for performance

  ## Security
  - Enable RLS on email_replies table
  - Add policies for authenticated users to manage their own reply data
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

-- Create index for reply_count
CREATE INDEX IF NOT EXISTS idx_email_sent_reply_count ON email_sent(reply_count);

-- Email replies table (NEW FEATURE)
CREATE TABLE IF NOT EXISTS email_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sent_email_id uuid NOT NULL REFERENCES email_sent(id) ON DELETE CASCADE,
  received_email_id uuid NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  from_email text NOT NULL,
  subject text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_replies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_replies_user_id ON email_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_sent_email_id ON email_replies(sent_email_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_received_email_id ON email_replies(received_email_id);

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own email replies" ON email_replies;
  DROP POLICY IF EXISTS "Users can insert own email replies" ON email_replies;
  DROP POLICY IF EXISTS "Users can delete own email replies" ON email_replies;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can read own email replies"
  ON email_replies FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email replies"
  ON email_replies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own email replies"
  ON email_replies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update reply counts
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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_reply_count_trigger ON email_replies;

CREATE TRIGGER update_reply_count_trigger
  AFTER INSERT OR DELETE ON email_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_email_reply_count();

-- Enable realtime subscriptions
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE email_sent;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE email_replies;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;