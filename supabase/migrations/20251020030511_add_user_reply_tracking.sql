/*
  # Add user reply tracking to client emails

  ## Changes
  - Add column `user_reply_count` to `emails` table to track how many times user replied to a client email
  - Add column `last_user_reply_at` to `emails` table to track when user last replied
  - Create trigger to update these fields when user sends a reply
  
  This allows tracking both:
  1. Client replies to sent emails (existing in email_replies table)
  2. User replies to client emails (new tracking on emails table)
*/

-- Add tracking columns to emails table for user replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'user_reply_count'
  ) THEN
    ALTER TABLE emails ADD COLUMN user_reply_count integer DEFAULT 0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'last_user_reply_at'
  ) THEN
    ALTER TABLE emails ADD COLUMN last_user_reply_at timestamptz;
  END IF;
END $$;

-- Create function to update user reply tracking
CREATE OR REPLACE FUNCTION update_user_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When an email is sent with a reply_to_id pointing to an email in the emails table,
  -- update the reply count on that original email
  IF NEW.reply_to_id IS NOT NULL THEN
    UPDATE emails
    SET 
      user_reply_count = user_reply_count + 1,
      last_user_reply_at = NEW.sent_at
    WHERE id = NEW.reply_to_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on email_sent table to track user replies
DROP TRIGGER IF EXISTS track_user_replies ON email_sent;
CREATE TRIGGER track_user_replies
  AFTER INSERT ON email_sent
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reply_count();