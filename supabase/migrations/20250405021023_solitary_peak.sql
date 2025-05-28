/*
  # Remove sending rate from campaign emails

  1. Changes
    - Remove sending_rate column from campaign_emails table
    - This change completes the migration to using provider-specific daily limits
*/

-- Remove sending_rate from campaign_emails
ALTER TABLE campaign_emails 
DROP COLUMN IF EXISTS sending_rate;