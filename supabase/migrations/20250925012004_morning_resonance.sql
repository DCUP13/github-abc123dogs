/*
  # Fix Email User Data Isolation

  1. Schema Changes
    - Add `user_id` column to `emails` table
    - Add foreign key constraint to `profiles` table
    - Add index for performance

  2. Security Updates
    - Replace permissive RLS policies with user-isolated policies
    - Ensure users can only see their own emails
    - Prevent cross-user data access

  3. Data Cleanup
    - Remove any orphaned emails without user association
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

-- Clean up any orphaned emails that don't have a user_id
DELETE FROM emails WHERE user_id IS NULL;

-- Make user_id NOT NULL after cleanup
ALTER TABLE emails ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'emails_user_id_fkey'
  ) THEN
    ALTER TABLE emails ADD CONSTRAINT emails_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_emails_user_id'
  ) THEN
    CREATE INDEX idx_emails_user_id ON emails(user_id);
  END IF;
END $$;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow authenticated delete" ON emails;
DROP POLICY IF EXISTS "Allow authenticated insert" ON emails;
DROP POLICY IF EXISTS "Allow authenticated read" ON emails;
DROP POLICY IF EXISTS "anon insert" ON emails;
DROP POLICY IF EXISTS "anon read" ON emails;

-- Create proper user-isolated RLS policies
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

CREATE POLICY "Users can update own emails"
  ON emails
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);