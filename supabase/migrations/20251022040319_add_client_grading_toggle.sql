/*
  # Add client grading toggle to user settings

  ## Changes
  - Add `client_grading_enabled` column to `user_settings` table
  - Defaults to false to improve performance in high-volume email conversations
  - When disabled, the process-client-email function will skip the AI grading step
  
  This allows users to disable the expensive AI grading operation if they're experiencing
  performance issues or don't need automatic client grading.
*/

-- Add client grading toggle to user_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'client_grading_enabled'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN client_grading_enabled boolean DEFAULT false NOT NULL;
  END IF;
END $$;