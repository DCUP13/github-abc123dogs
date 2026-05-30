/*
  # Add property_info to prompts table

  ## Summary
  Adds a `property_info` JSONB column to the `prompts` table so that Real Estate
  prompts can store structured property details (address, price, beds, baths, sqft,
  description, etc.). This data is injected into prompt content via the
  `{{property_info}}` placeholder at autoresponder runtime.

  ## Changes
  - `prompts`: new nullable `property_info` (jsonb) column, defaults to null
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts' AND column_name = 'property_info'
  ) THEN
    ALTER TABLE prompts ADD COLUMN property_info jsonb DEFAULT NULL;
  END IF;
END $$;
