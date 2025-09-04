/*
  # Change receiver column to text array

  1. Schema Changes
    - Modify `emails` table `receiver` column from `text` to `text[]`
    - This allows storing multiple email recipients in a single record
    - Supports the Lambda function sending arrays of recipient emails

  2. Data Migration
    - Convert existing single receiver values to single-element arrays
    - Preserve all existing data during the migration

  3. Notes
    - This change supports multiple recipients per email
    - Lambda code can now send arrays of recipient emails
    - Frontend will need to handle array format when displaying recipients
*/

-- First, add a new column with the array type
ALTER TABLE emails ADD COLUMN receiver_array text[];

-- Migrate existing data: convert single receiver to single-element array
UPDATE emails 
SET receiver_array = ARRAY[receiver] 
WHERE receiver IS NOT NULL;

-- Handle NULL values by setting empty array
UPDATE emails 
SET receiver_array = ARRAY[]::text[] 
WHERE receiver IS NULL;

-- Drop the old column
ALTER TABLE emails DROP COLUMN receiver;

-- Rename the new column to the original name
ALTER TABLE emails RENAME COLUMN receiver_array TO receiver;

-- Make the column NOT NULL with default empty array
ALTER TABLE emails ALTER COLUMN receiver SET NOT NULL;
ALTER TABLE emails ALTER COLUMN receiver SET DEFAULT ARRAY[]::text[];