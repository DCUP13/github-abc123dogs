/*
  # Add Email Management and Reply Tracking Tables

  ## Tables Created
  - templates: Email templates
  - emails: Received emails (inbox)  
  - email_sent: Sent emails WITH reply tracking
  - email_replies: Tracks individual replies (NEW FEATURE)

  ## Reply Tracking Feature
  - Tracks reply_count and last_reply_at on sent emails
  - Records each reply in email_replies table
  - Automatic trigger updates counts
*/

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  format text NOT NULL,
  imported boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own templates"
  ON templates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
  ON templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON templates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON templates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Email inbox table
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  attachments JSONB,
  zip_code TEXT,
  receiver TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated insert"
  ON emails FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read"
  ON emails FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated delete"
  ON emails FOR DELETE TO authenticated
  USING (true);

-- Email sent table WITH REPLY TRACKING COLUMNS
CREATE TABLE IF NOT EXISTS email_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  from_email text NOT NULL,
  subject text,
  body text,
  reply_to_id uuid REFERENCES emails(id) ON DELETE SET NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  reply_count integer DEFAULT 0 NOT NULL,
  last_reply_at timestamptz,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_sent ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_sent_user_id ON email_sent(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sent_reply_count ON email_sent(reply_count);

CREATE POLICY "Users can read own sent emails"
  ON email_sent FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sent emails"
  ON email_sent FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sent emails"
  ON email_sent FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

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

-- Trigger to update reply counts when replies are added/removed
CREATE TRIGGER update_reply_count_trigger
  AFTER INSERT OR DELETE ON email_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_email_reply_count();

-- Enable realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE email_sent;
ALTER PUBLICATION supabase_realtime ADD TABLE email_replies;