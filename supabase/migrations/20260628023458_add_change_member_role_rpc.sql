
-- RPC that changes a member's role, running as postgres (SECURITY DEFINER)
-- so it bypasses RLS. Permission is enforced inside the function.
CREATE OR REPLACE FUNCTION change_member_role(p_member_id uuid, p_new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_target_role text;
  v_caller_role text;
BEGIN
  -- Validate requested role
  IF p_new_role NOT IN ('member', 'manager') THEN
    RAISE EXCEPTION 'Invalid role: must be member or manager';
  END IF;

  -- Get the target member's org and current role
  SELECT organization_id, role INTO v_org_id, v_target_role
  FROM organization_members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot change the role of the organization owner';
  END IF;

  -- Check the caller is owner or manager of the same org
  SELECT role INTO v_caller_role
  FROM organization_members
  WHERE organization_id = v_org_id AND user_id = auth.uid();

  IF v_caller_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Permission denied: must be owner or manager';
  END IF;

  -- Only owners can promote to manager
  IF p_new_role = 'manager' AND v_caller_role != 'owner' THEN
    RAISE EXCEPTION 'Only owners can promote members to manager';
  END IF;

  UPDATE organization_members SET role = p_new_role WHERE id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION change_member_role(uuid, text) TO authenticated;
