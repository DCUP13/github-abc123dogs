/*
# Scope member deletion: managers can only remove members, owners remove anyone

## Problem
The existing DELETE policy on organization_members allows any manager to
delete any row (including other managers). Owners should be able to delete
managers; managers should only be able to delete regular members.

## Changes

### Modified table: organization_members
- DROP + RECREATE the DELETE policy with two separate permission paths:
  1. Owners: can delete any row except their own (prevents self-removal)
  2. Managers: can only delete rows where role = 'member'
*/

DROP POLICY IF EXISTS "Owners and managers can remove members" ON organization_members;
DROP POLICY IF EXISTS "delete_organization_members" ON organization_members;

CREATE POLICY "delete_organization_members"
ON organization_members FOR DELETE
TO authenticated
USING (
  -- Owners can remove anyone except themselves
  (
    auth.uid() != user_id
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  )
  OR
  -- Managers can only remove regular members (not other managers or owners)
  (
    role = 'member'
    AND auth.uid() != user_id
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role = 'manager'
    )
  )
);
