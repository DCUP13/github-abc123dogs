/*
  # Add Inbox Mode to User Settings

  1. Changes
    - Add `inbox_mode` column to `user_settings` table
      - Allows managers/owners to toggle between "master" (all domain emails) and "regular" (only assigned emails)
      - Default value is "master" for managers
      - Members always use "regular" mode

  2. Notes
    - This enables different inbox views based on user role
    - Master inbox shows all emails for managed domains
    - Regular inbox shows only emails to user's assigned address
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'inbox_mode'
  ) THEN
    ALTER TABLE user_settings 
    ADD COLUMN inbox_mode text DEFAULT 'master' 
    CHECK (inbox_mode IN ('master', 'regular'));
  END IF;
END $$;