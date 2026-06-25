/*
# Multi-org: allow org owner to bootstrap their own membership

## Problem
When an owner creates a new organization, they need to add themselves as the
first member. The existing INSERT policy only allows the insert if the inserter
is already a member — a chicken-and-egg problem.

## Changes

### Modified table: organization_members
- DROP + RECREATE the INSERT policy to add a bootstrap clause:
  An owner may insert themselves (user_id = auth.uid(), role = 'owner') into
  any org they own (organizations.owner_id = auth.uid()), even before any
  member row exists for that org.
  The existing "manager or owner can add others" path is preserved unchanged.

## Notes
1. DROP POLICY IF EXISTS handles any name variant from prior fix-migrations.
2. The new "bootstrap" path is tightly scoped: self-insert only, role must be
   'owner', org must have owner_id matching the caller.
3. No other policies are changed.
*/

-- Drop all known variant names from prior migrations
DROP POLICY IF EXISTS "Owners and managers can add members" ON organization_members;
DROP POLICY IF EXISTS "insert_organization_members" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert" ON organization_members;

CREATE POLICY "insert_organization_members"
ON organization_members FOR INSERT
TO authenticated
WITH CHECK (
  -- Bootstrap: org owner can insert themselves as the first member
  (
    auth.uid() = user_id
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_id
        AND owner_id = auth.uid()
    )
  )
  OR
  -- Normal path: existing owner/manager can add anyone
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
  )
);
