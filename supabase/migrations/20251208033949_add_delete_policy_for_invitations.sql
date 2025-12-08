/*
  # Add Delete Policy for Member Invitations

  1. Changes
    - Add DELETE policy for member_invitations table
    - Allows owners and managers to delete invitations from their organization

  2. Security
    - Only owners and managers can delete invitations
    - Users can only delete invitations from their own organization
*/

-- Add delete policy for member_invitations
CREATE POLICY "Owners and managers can delete invitations"
  ON member_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = member_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'manager')
    )
  );