/*
# Shared Prompts - Part 2: SELECT policy

Adds the SELECT policy on shared_prompts now that shared_prompt_orgs exists.
The policy allows a user to see a shared prompt if:
  - They are the sharer
  - Scope is 'global' and they belong to any org
  - Scope is 'organization' and they belong to one of the targeted orgs in shared_prompt_orgs
  - Scope is 'team' and they share an org with the sharer
*/

DROP POLICY IF EXISTS "select_shared_prompts" ON shared_prompts;
CREATE POLICY "select_shared_prompts" ON shared_prompts FOR SELECT
  TO authenticated
  USING (
    shared_by = auth.uid()
    OR
    (scope = 'global' AND EXISTS (
      SELECT 1 FROM organization_members WHERE user_id = auth.uid()
    ))
    OR
    (scope = 'organization' AND EXISTS (
      SELECT 1 FROM shared_prompt_orgs spo
      JOIN organization_members om ON om.organization_id = spo.organization_id
      WHERE spo.shared_prompt_id = shared_prompts.id
        AND om.user_id = auth.uid()
    ))
    OR
    (scope = 'team' AND EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om2.organization_id = om1.organization_id
      WHERE om1.user_id = shared_prompts.shared_by
        AND om2.user_id = auth.uid()
    ))
  );
