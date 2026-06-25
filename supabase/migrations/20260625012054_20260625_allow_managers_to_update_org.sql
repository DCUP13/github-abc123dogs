/*
# Allow managers to update organization details

## Problem
The existing UPDATE policy on `organizations` is restricted to the row's
`owner_id`. Managers who are NOT the owner cannot save changes to org
details even though the UI shows them an Edit button.

## Changes

### Modified table: organizations
- DROP + RECREATE the UPDATE policy to also allow users who have the
  `manager` (or `owner`) role in `organization_members` for that org.
  This matches the existing pattern used for other manager-level operations.

## Notes
1. The SELECT, INSERT, and DELETE policies are unchanged.
2. Owners retain full update access as before (via both the owner_id
   check and the membership check).
*/

DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;

CREATE POLICY "Owners and managers can update their organizations"
ON organizations FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = organizations.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
  )
);
