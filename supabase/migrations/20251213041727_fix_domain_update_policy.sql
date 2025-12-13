/*
  # Fix Domain UPDATE Policy for Managers

  1. Changes
    - Replace the UPDATE policy for managers to use the helper function
    - This ensures consistent evaluation across INSERT, SELECT, and UPDATE operations
    - Allows managers/owners to update domains for their team members

  2. Security
    - Uses SECURITY DEFINER helper function for consistent RLS evaluation
    - Maintains existing permission structure
    - Only managers/owners can update member domains
*/

-- Drop the existing manager UPDATE policy
DROP POLICY IF EXISTS "Managers can update member domains" ON amazon_ses_domains;

-- Create new UPDATE policy using the helper function
CREATE POLICY "Managers can update member domains"
  ON amazon_ses_domains
  FOR UPDATE
  TO authenticated
  USING (can_manage_user_resources(user_id))
  WITH CHECK (can_manage_user_resources(user_id));
