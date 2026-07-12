/*
# Replace get_shared_prompts_for_user RPC: use expanded columns instead of row_to_json

## Problem
The previous version returned `prompts json` using `row_to_json(p.*)`.
PostgREST double-encodes `json`-typed columns in RETURNS TABLE functions — they arrive at
the JavaScript client as a JSON string rather than a parsed object. Spreading a string
(`...sp.prompts`) produces integer-keyed character entries, so all named prompt fields
(title, content, prompt_type, etc.) are undefined — the exact "garbage data" symptom.

## Fix
Drop and recreate the function with expanded prompt columns as first-class typed columns.
No JSON serialization involved; PostgREST returns each as its native type.
*/

DROP FUNCTION IF EXISTS get_shared_prompts_for_user();

CREATE FUNCTION get_shared_prompts_for_user()
RETURNS TABLE (
  id                         uuid,
  prompt_id                  uuid,
  shared_by                  uuid,
  scope                      text,
  created_at                 timestamptz,
  p_id                       uuid,
  p_user_id                  uuid,
  p_title                    text,
  p_content                  text,
  p_category                 text,
  p_prompt_type              text,
  p_step2_content            text,
  p_response_mode            text,
  p_template_subject         text,
  p_template_body            text,
  p_template_ai_instructions text,
  p_property_info            jsonb,
  p_company_info             text,
  p_created_at               timestamptz,
  p_updated_at               timestamptz,
  shared_prompt_orgs         jsonb
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
    p.id                       AS p_id,
    p.user_id                  AS p_user_id,
    p.title                    AS p_title,
    p.content                  AS p_content,
    p.category                 AS p_category,
    p.prompt_type              AS p_prompt_type,
    p.step2_content            AS p_step2_content,
    p.response_mode            AS p_response_mode,
    p.template_subject         AS p_template_subject,
    p.template_body            AS p_template_body,
    p.template_ai_instructions AS p_template_ai_instructions,
    p.property_info            AS p_property_info,
    p.company_info             AS p_company_info,
    p.created_at               AS p_created_at,
    p.updated_at               AS p_updated_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'organization_id', spo.organization_id,
            'organizations', jsonb_build_object('name', o.name)
          )
        )
        FROM shared_prompt_orgs spo
        JOIN organizations o ON o.id = spo.organization_id
        WHERE spo.shared_prompt_id = sp.id
      ),
      '[]'::jsonb
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
