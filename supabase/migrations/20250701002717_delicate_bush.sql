/*
  # Add title company field to campaigns

  1. Changes
    - Add `title_company` column to `campaigns` table
    - Set default value to empty string
    - Add documentation for the new field

  2. Documentation
    - The column stores the name of the title company for the campaign
*/

-- Add title_company column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN title_company text NOT NULL DEFAULT '';

-- Add documentation
COMMENT ON COLUMN campaigns.title_company IS 'Name of the title company for the campaign';