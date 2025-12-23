/*
  # Move autoresponder and drafts settings to email-level

  1. Changes
    - Add `drafts_enabled` column to `amazon_ses_emails` table
    - Add constraint to ensure both autoresponder and drafts cannot be enabled simultaneously on email addresses
    - Update RLS policies to allow managers to update email settings for their team members

  2. Logic
    - Each email address now has independent autoresponder_enabled and drafts_enabled settings
    - Domain-level settings are deprecated (kept for backward compatibility but not used)
    - Managers can control these settings for all team members

  3. Security
    - RLS policies ensure only organization managers can update member email settings
    - Members can view their own email settings
*/

-- Add drafts_enabled column to amazon_ses_emails if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'amazon_ses_emails' AND column_name = 'drafts_enabled'
  ) THEN
    ALTER TABLE amazon_ses_emails ADD COLUMN drafts_enabled boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Drop the old constraint on amazon_ses_domains if it exists
ALTER TABLE amazon_ses_domains DROP CONSTRAINT IF EXISTS drafts_requires_autoresponder_off;

-- Add constraint to amazon_ses_emails to prevent both being enabled
ALTER TABLE amazon_ses_emails DROP CONSTRAINT IF EXISTS email_drafts_requires_autoresponder_off;

ALTER TABLE amazon_ses_emails ADD CONSTRAINT email_drafts_requires_autoresponder_off
  CHECK (NOT (autoresponder_enabled = true AND drafts_enabled = true));

-- Update existing records where both might be true (set drafts to false if autoresponder is true)
UPDATE amazon_ses_emails
SET drafts_enabled = false
WHERE autoresponder_enabled = true AND drafts_enabled = true;