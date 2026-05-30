/*
  # Add prompts_category_filter to user_settings

  1. Changes
    - `user_settings`: adds `prompts_category_filter` (text, default 'All')
      - Stores the user's preferred category filter for the Prompts page
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'prompts_category_filter'
  ) THEN
    ALTER TABLE user_settings
      ADD COLUMN prompts_category_filter text NOT NULL DEFAULT 'All';
  END IF;
END $$;
