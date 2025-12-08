/*
  # Fix Invitation Policy Using JWT Claims

  1. Changes
    - Drop the existing policy
    - Create a policy that uses JWT claims to get user email
    - This avoids timing issues with auth.users table
  
  2. Security
    - Validates user is adding themselves
    - Checks invitation exists by matching JWT email claim
    - Ensures invitation is valid and not expired
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can join via valid invitation" ON organization_members;

-- Create policy using JWT claims for immediate email access
CREATE POLICY "Users can join via valid invitation"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM member_invitations mi
      WHERE mi.organization_id = organization_members.organization_id
      AND mi.email = (auth.jwt() ->> 'email')::text
      AND mi.status = 'pending'
      AND mi.expires_at > now()
      AND (mi.role = organization_members.role OR (mi.role IS NULL AND organization_members.role = 'member'))
    )
  );
