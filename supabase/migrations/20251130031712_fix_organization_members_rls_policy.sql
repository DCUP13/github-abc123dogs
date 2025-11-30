/*
  # Fix Organization Members RLS Policy

  1. Changes
    - Add policy to allow users to view their own membership records
    - This fixes the chicken-and-egg problem where users can't see if they're in an organization

  2. Security
    - Users can only see their own membership records (user_id = auth.uid())
    - All other existing policies remain unchanged
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'organization_members' 
    AND policyname = 'Users can view their own memberships'
  ) THEN
    CREATE POLICY "Users can view their own memberships"
      ON organization_members
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
