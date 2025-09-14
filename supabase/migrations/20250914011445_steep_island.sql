/*
  # Add autoresponder feature to SES domains

  1. Schema Changes
    - Add `autoresponder_enabled` column to `amazon_ses_domains` table
    - Default value: false
    - Type: boolean, not nullable

  2. Security
    - No changes to existing RLS policies needed
    - Column inherits existing security model
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'amazon_ses_domains' AND column_name = 'autoresponder_enabled'
  ) THEN
    ALTER TABLE amazon_ses_domains ADD COLUMN autoresponder_enabled boolean DEFAULT false NOT NULL;
  END IF;
END $$;