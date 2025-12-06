/*
  # Add noreply domain setting to Amazon SES settings

  1. Changes
    - Add `noreply_domain` column to `amazon_ses_settings` table
    - This column stores which verified domain should be used for noreply@ emails
    - Used by system emails like team invitations

  2. Details
    - Column is optional (can be NULL)
    - When NULL, system will use first available domain or fallback
*/

ALTER TABLE amazon_ses_settings
ADD COLUMN IF NOT EXISTS noreply_domain text;