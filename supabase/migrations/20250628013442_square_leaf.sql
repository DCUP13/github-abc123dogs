/*
  # Add clean_up_loi setting to user_settings table

  1. Changes
    - Add `clean_up_loi` column to `user_settings` table
    - Set default value to false
    - Update existing records to have the default value

  2. Documentation
    - This setting controls whether attachments are deleted from local filesystem when campaigns are running
*/

-- Add clean_up_loi column to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN clean_up_loi boolean NOT NULL DEFAULT false;

-- Update existing settings to have clean_up_loi disabled by default
UPDATE public.user_settings
SET clean_up_loi = false
WHERE clean_up_loi IS NULL;

-- Add documentation
COMMENT ON COLUMN user_settings.clean_up_loi IS 'Delete attachments from local filesystem when campaigns are running';