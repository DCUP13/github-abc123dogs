/*
  # Fix Organization Members RLS Timeout Issue

  1. Changes
    - Drop the recursive self-referential RLS policy that causes timeouts
    - Keep only the simple "Users can view their own memberships" policy
    - This policy allows: user_id = auth.uid()
    - No recursive queries needed

  2. Security
    - Users can only see their own membership records
    - Fast query with direct user_id check
    - No performance issues
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Members can view other members in their organization" ON organization_members;

-- Ensure the simple policy exists
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
