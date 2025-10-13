/*
  # Add autoresponder_enabled column to amazon_ses_emails

  1. Changes
    - Add `autoresponder_enabled` column to `amazon_ses_emails` table
    - Default value is `false` (disabled by default)
    - This allows per-email autoresponder configuration

  2. Notes
    - Existing emails will have autoresponder disabled by default
    - Users can enable autoresponder for specific email addresses in the UI
*/

-- Add autoresponder_enabled column to amazon_ses_emails
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'amazon_ses_emails' AND column_name = 'autoresponder_enabled'
  ) THEN
    ALTER TABLE amazon_ses_emails ADD COLUMN autoresponder_enabled boolean DEFAULT false NOT NULL;
  END IF;
END $$;
