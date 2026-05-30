/*
  # Add company_info to prompts table

  ## Summary
  Adds a `company_info` text column to the `prompts` table so that General
  category prompts can store a freeform description of the company, its products,
  and services. This data is injected into prompt content via the
  `{{company_info}}` placeholder at autoresponder runtime.

  ## Changes
  - `prompts`: new nullable `company_info` (text) column, defaults to null
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts' AND column_name = 'company_info'
  ) THEN
    ALTER TABLE prompts ADD COLUMN company_info text DEFAULT NULL;
  END IF;
END $$;
