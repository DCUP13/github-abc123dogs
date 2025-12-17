/*
  # Fix Dashboard Statistics RLS for Managers

  1. Changes
    - Update SELECT policy to allow managers to view member statistics
    - Use the can_manage_user_resources helper function for consistency
    - Consolidate with existing user policy

  2. Security
    - Users can view their own statistics
    - Managers can view statistics for their team members
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own statistics" ON dashboard_statistics;
DROP POLICY IF EXISTS "Managers can view member statistics" ON dashboard_statistics;

-- Create unified SELECT policy
CREATE POLICY "Users and managers can view statistics"
  ON dashboard_statistics
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR can_manage_user_resources(user_id)
  );
