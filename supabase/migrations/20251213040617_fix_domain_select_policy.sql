/*
  # Fix Domain SELECT Policy for Managers

  1. Changes
    - Replace the SELECT policy for managers to use the same helper function as INSERT
    - This ensures consistent evaluation across INSERT and SELECT operations
    - Maintains ability for users to read their own domains
    - Allows managers/owners to view domains of their team members

  2. Security
    - Uses SECURITY DEFINER helper function for consistent RLS evaluation
    - Maintains existing permission structure
    - No breaking changes to existing functionality
*/

-- Drop the existing manager SELECT policy
DROP POLICY IF EXISTS "Managers can view member domains" ON amazon_ses_domains;

-- Create new SELECT policy using the helper function
CREATE POLICY "Managers can view member domains"
  ON amazon_ses_domains
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR can_manage_user_resources(user_id)
  );
