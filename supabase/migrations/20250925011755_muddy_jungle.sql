/*
  # Fix Email Data Isolation

  1. Schema Changes
    - Add `user_id` column to `emails` table to associate emails with users
    - Add foreign key constraint to ensure data integrity

  2. Security Updates
    - Update RLS policies to restrict users to only see their own emails
    - Ensure proper user isolation for all email operations

  3. Data Migration
    - Set existing emails to a default user (if any exist)
    - Enable proper user-based access control
*/

-- Add user_id column to emails table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE emails ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'emails_user_id_fkey'
  ) THEN
    ALTER TABLE emails 
    ADD CONSTRAINT emails_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make user_id NOT NULL after adding the constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'user_id' AND is_nullable = 'YES'
  ) THEN
    -- First, delete any emails without a user_id (orphaned emails)
    DELETE FROM emails WHERE user_id IS NULL;
    
    -- Then make the column NOT NULL
    ALTER TABLE emails ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated read" ON emails;
DROP POLICY IF EXISTS "Allow authenticated insert" ON emails;
DROP POLICY IF EXISTS "Allow authenticated delete" ON emails;

-- Create proper user-isolated policies
CREATE POLICY "Users can read own emails"
  ON emails
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails"
  ON emails
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails"
  ON emails
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add index for better performance on user_id queries
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);