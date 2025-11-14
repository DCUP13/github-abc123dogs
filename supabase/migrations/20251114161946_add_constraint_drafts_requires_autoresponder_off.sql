/*
  # Add constraint to ensure drafts_enabled is false when autoresponder_enabled is true

  1. Changes
    - Add check constraint to amazon_ses_domains table
    - Ensures drafts_enabled cannot be true when autoresponder_enabled is true
    - Prevents both modes from being active simultaneously

  2. Notes
    - This enforces the business rule at the database level
    - Prevents any application bugs from allowing both modes to be on
    - Users must choose either autoresponder or draft mode, not both
*/

-- Add check constraint to ensure drafts can't be enabled when autoresponder is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'drafts_requires_autoresponder_off'
  ) THEN
    ALTER TABLE amazon_ses_domains
    ADD CONSTRAINT drafts_requires_autoresponder_off
    CHECK (
      NOT (autoresponder_enabled = true AND drafts_enabled = true)
    );
  END IF;
END $$;

-- Update any existing rows that violate the constraint
UPDATE amazon_ses_domains
SET drafts_enabled = false
WHERE autoresponder_enabled = true AND drafts_enabled = true;
