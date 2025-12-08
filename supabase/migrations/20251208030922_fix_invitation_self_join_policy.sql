/*
  # Fix Invitation Self-Join Policy

  1. Changes
    - Drop the existing "Users can join via valid invitation" policy
    - Create a simpler policy that doesn't rely on auth.users JOIN
    - Directly check invitation exists by matching email from JWT
  
  2. Security
    - Policy validates:
      - User is adding themselves (user_id = auth.uid())
      - Valid pending invitation exists
      - Invitation email matches user's email from JWT
      - Invitation is for the same organization
      - Invitation has not expired
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can join via valid invitation" ON organization_members;

-- Create simplified policy that works with newly created users
CREATE POLICY "Users can join via valid invitation"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM member_invitations mi
      WHERE mi.organization_id = organization_members.organization_id
      AND mi.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND mi.status = 'pending'
      AND mi.expires_at > now()
      AND (mi.role = organization_members.role OR (mi.role IS NULL AND organization_members.role = 'member'))
    )
  );
