/*
# Fix infinite recursion: replace prompts RLS policy with SECURITY DEFINER RPC

## Root cause
The `select_shared_prompt_content` policy on `prompts` queries `shared_prompts`.
The `shared_prompts` INSERT policy queries `prompts` to verify ownership.
When a member inserts a row into `shared_prompts`, PostgreSQL evaluates the INSERT
policy, which queries `prompts`, which applies `select_shared_prompt_content`, which
queries `shared_prompts` — hitting the table currently being evaluated. PostgreSQL
detects this as infinite recursion and aborts.

## Fix
1. Drop `select_shared_prompt_content` from `prompts` — this removes the cycle.
2. Create `get_shared_prompts_for_user()` as a SECURITY DEFINER function that runs
   as the DB owner (bypassing all RLS) and applies visibility rules in its own WHERE
   clause. Callers get the exact same data without any cross-table policy references.

## Visibility rules encoded in the function (matching the old policies)
A user can see a shared prompt if:
  - They are the sharer (shared_by = auth.uid())
  - They are the platform owner (profiles.is_platform_owner = true)
  - scope = 'global' and they belong to any org
  - scope = 'organization' and they belong to one of the targeted orgs
  - scope = 'team' and they share an org with the sharer

## Returns
Columns: id, prompt_id, shared_by, scope, created_at, prompts (json), shared_prompt_orgs (json array)
The shape matches the existing Supabase join query so the frontend mapping is unchanged.

## Tables / Functions Modified
- prompts: DROP SELECT policy select_shared_prompt_content
- New function: get_shared_prompts_for_user() SECURITY DEFINER
*/

-- 1. Remove the recursive policy
DROP POLICY IF EXISTS "select_shared_prompt_content" ON prompts;

-- 2. Also restore the original plain owner-only policy that the above replaced
--    (Migration 20260711171029 first added select_shared_prompt_content which also
--     included user_id = auth.uid(). The original "Users can read own prompts" policy
--     from teal_garden handles owner reads, so no action needed there.)

-- 3. Create the SECURITY DEFINER function
CREATE OR REPLACE FUNCTION get_shared_prompts_for_user()
RETURNS TABLE (
  id uuid,
  prompt_id uuid,
  shared_by uuid,
  scope text,
  created_at timestamptz,
  prompts json,
  shared_prompt_orgs json
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sp.id,
    sp.prompt_id,
    sp.shared_by,
    sp.scope,
    sp.created_at,
    row_to_json(p.*) AS prompts,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'organization_id', spo.organization_id,
            'organizations', json_build_object('name', o.name)
          )
        )
        FROM shared_prompt_orgs spo
        JOIN organizations o ON o.id = spo.organization_id
        WHERE spo.shared_prompt_id = sp.id
      ),
      '[]'::json
    ) AS shared_prompt_orgs
  FROM shared_prompts sp
  JOIN prompts p ON p.id = sp.prompt_id
  WHERE
    sp.shared_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_owner = true
    )
    OR (
      sp.scope = 'global'
      AND EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid())
    )
    OR (
      sp.scope = 'organization'
      AND EXISTS (
        SELECT 1 FROM shared_prompt_orgs spo
        JOIN organization_members om ON om.organization_id = spo.organization_id
        WHERE spo.shared_prompt_id = sp.id AND om.user_id = auth.uid()
      )
    )
    OR (
      sp.scope = 'team'
      AND EXISTS (
        SELECT 1 FROM organization_members om1
        JOIN organization_members om2 ON om2.organization_id = om1.organization_id
        WHERE om1.user_id = sp.shared_by AND om2.user_id = auth.uid()
      )
    )
  ORDER BY sp.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION get_shared_prompts_for_user() TO authenticated;
