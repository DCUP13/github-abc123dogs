/*
  # Add prompts_sort_order to user_settings

  1. Changes
    - `user_settings`: adds `prompts_sort_order` (text, default 'updated_desc')
      - Stores the user's preferred sort order for the Prompts page
      - Constrained to the six valid sort values
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'prompts_sort_order'
  ) THEN
    ALTER TABLE user_settings
      ADD COLUMN prompts_sort_order text NOT NULL DEFAULT 'updated_desc'
        CHECK (prompts_sort_order = ANY (ARRAY[
          'updated_desc', 'updated_asc',
          'created_desc', 'created_asc',
          'title_asc',    'title_desc'
        ]));
  END IF;
END $$;
