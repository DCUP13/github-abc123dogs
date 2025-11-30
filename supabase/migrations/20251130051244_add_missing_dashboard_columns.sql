/*
  # Add Missing Dashboard Columns

  1. Changes
    - Add `total_templates` column to dashboard_statistics table
    - Add `total_campaigns` column to dashboard_statistics table
    - Set default values to 0 for both columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dashboard_statistics' AND column_name = 'total_templates'
  ) THEN
    ALTER TABLE dashboard_statistics ADD COLUMN total_templates integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dashboard_statistics' AND column_name = 'total_campaigns'
  ) THEN
    ALTER TABLE dashboard_statistics ADD COLUMN total_campaigns integer DEFAULT 0;
  END IF;
END $$;
