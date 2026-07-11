/*
# Allow reading shared prompts content

## Problem
The prompts table SELECT policy only allows reading rows where user_id = auth.uid().
When user B views a shared prompt from user A, the prompts(*) join in fetchSharedPrompts
returns null because user B cannot read user A's row. This causes:
  - "Use" copying null/undefined fields → fails on NOT NULL title constraint
  - prompt_type showing as undefined → rendered as 1-step even if original was 2-step

## Fix
Add a second SELECT policy that allows reading a prompt when:
  - It has a shared_prompts record visible to the current user (by scope rules).

The flow is one-directional (prompts → shared_prompts → organization_members/shared_prompt_orgs)
so there is no circular RLS reference.

## Security
Users can only READ shared prompt content — they cannot modify it. The existing owner-scoped
INSERT/UPDATE/DELETE policies are unchanged. The prompt content itself is not sensitive; it is
intentionally being shared by the owner.

## Tables Modified
- prompts: added SELECT policy "select_shared_prompt_content"
*/

DROP POLICY IF EXISTS "select_shared_prompt_content" ON prompts;
CREATE POLICY "select_shared_prompt_content" ON prompts FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared_prompts sp
      WHERE sp.prompt_id = prompts.id
        AND (
          sp.shared_by = auth.uid()
          OR
          (sp.scope = 'global' AND EXISTS (
            SELECT 1 FROM organization_members WHERE user_id = auth.uid()
          ))
          OR
          (sp.scope = 'organization' AND EXISTS (
            SELECT 1 FROM shared_prompt_orgs spo
            JOIN organization_members om ON om.organization_id = spo.organization_id
            WHERE spo.shared_prompt_id = sp.id AND om.user_id = auth.uid()
          ))
          OR
          (sp.scope = 'team' AND EXISTS (
            SELECT 1 FROM organization_members om1
            JOIN organization_members om2 ON om2.organization_id = om1.organization_id
            WHERE om1.user_id = sp.shared_by AND om2.user_id = auth.uid()
          ))
        )
    )
  );
