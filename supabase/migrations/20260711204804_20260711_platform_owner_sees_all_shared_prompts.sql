/*
# Platform owner can see all shared prompts

## Problem
The platform owner needs to see every shared prompt regardless of scope or org membership.
The current 'team' scope policy only grants access when sharer and viewer share an org.
If the platform owner isn't in the sharer's org, they miss those prompts entirely.

## Fix
Add a platform owner escape clause to:
  1. shared_prompts SELECT policy — owner sees all rows
  2. prompts select_shared_prompt_content SELECT policy — owner can read the prompt content

## Tables Modified
- shared_prompts: updated SELECT policy
- prompts: updated SELECT policy for shared content
*/

-- 1. shared_prompts: platform owner sees everything
DROP POLICY IF EXISTS "select_shared_prompts" ON shared_prompts;
CREATE POLICY "select_shared_prompts" ON shared_prompts FOR SELECT
  TO authenticated
  USING (
    shared_by = auth.uid()
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_owner = true)
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

-- 2. prompts: platform owner can read content of any shared prompt
DROP POLICY IF EXISTS "select_shared_prompt_content" ON prompts;
CREATE POLICY "select_shared_prompt_content" ON prompts FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_owner = true)
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
