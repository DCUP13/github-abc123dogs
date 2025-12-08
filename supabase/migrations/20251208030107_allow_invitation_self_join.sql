/*
  # Allow Users to Join Organizations via Valid Invitations

  1. Changes
    - Add RLS policy to allow authenticated users to add themselves to an organization
    - Only works if they have a valid pending invitation
  
  2. Security
    - Policy only allows insertion where:
      - User is inserting themselves (user_id = auth.uid())
      - A valid pending invitation exists for their email
      - Invitation is for the same organization
      - Invitation has not expired
      - Role matches the invitation role
    - This enables the signup flow for invited members
*/

-- Allow users to add themselves to an organization if they have a valid invitation
CREATE POLICY "Users can join via valid invitation"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM member_invitations mi
      INNER JOIN auth.users u ON u.email = mi.email
      WHERE mi.organization_id = organization_members.organization_id
      AND u.id = auth.uid()
      AND mi.status = 'pending'
      AND mi.expires_at > now()
      AND (mi.role = organization_members.role OR (mi.role IS NULL AND organization_members.role = 'member'))
    )
  );
