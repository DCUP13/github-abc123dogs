/*
  # Add drafts mode to amazon_ses_domains table

  1. Changes
    - Add `drafts_enabled` column to `amazon_ses_domains` table
    - Default value is `false` (disabled by default)
    - When `autoresponder_enabled` is false and `drafts_enabled` is true:
      * AI processes the email using prompts
      * Generated response is saved as a draft instead of being sent
    - When `drafts_enabled` is false:
      * AI processing is skipped entirely to save tokens

  2. Notes
    - Existing domains will have drafts disabled by default
    - This provides a middle ground between full autoresponder and no automation
    - Helps users review AI-generated responses before sending
*/

-- Add drafts_enabled column to amazon_ses_domains
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'amazon_ses_domains' AND column_name = 'drafts_enabled'
  ) THEN
    ALTER TABLE amazon_ses_domains ADD COLUMN drafts_enabled boolean DEFAULT false NOT NULL;
  END IF;
END $$;
