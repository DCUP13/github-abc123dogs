/*
# Shared Organization CRM

## Overview
Converts the CRM from single-user to multi-tenant. Organization members share a CRM
scoped to their org. Existing personal contacts (org_id = NULL) are untouched.

## Schema Changes

### Modified Tables
- **clients**: Added org_id (FK organizations), assigned_to (FK auth.users), deleted_at
- **client_interactions**: Added org_id (FK organizations)
- **client_grades**: Added org_id (FK organizations)

### New Tables
1. **client_custom_fields** — Per-org dynamic field definitions (label, type, options, sort_order)
2. **client_custom_values** — EAV values for custom fields per client
3. **client_activity_log** — Append-only audit trail of CRM actions

### New Functions
- **is_org_member(uuid)** — Returns true if auth.uid() is a member of the given org
- **is_org_manager(uuid)** — Returns true if auth.uid() is an owner/manager of the given org
  Both use SECURITY DEFINER to prevent RLS recursion.

### RLS Changes
- clients: Members see only contacts assigned to them; managers/owners see all org contacts.
  Personal contacts (org_id IS NULL) remain user-scoped.
- client_interactions, client_grades: Follow the same visibility rules as clients.
- client_custom_fields: All org members can read; only managers/owners can write.
- client_custom_values: Org members with access to the client can read/write.
- client_activity_log: Org members can see org activity; personal logs limited to creator.
*/

-- ──────────────────────────────────────────
-- Helper functions (SECURITY DEFINER avoids RLS recursion when these are
-- called from within policies on other tables that join organization_members)
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_org_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_org_manager(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
  );
$$;

-- ──────────────────────────────────────────
-- clients: new columns
-- ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE clients ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE clients ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- ──────────────────────────────────────────
-- client_interactions: new columns
-- ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_interactions' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE client_interactions ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ──────────────────────────────────────────
-- client_grades: new columns
-- ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_grades' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE client_grades ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ──────────────────────────────────────────
-- client_custom_fields
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_custom_fields (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  field_key   text        NOT NULL,
  field_label text        NOT NULL,
  field_type  text        NOT NULL CHECK (field_type IN ('text','number','date','dropdown','boolean')),
  options     jsonb,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_by  uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, field_key)
);

ALTER TABLE client_custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_select_custom_fields"  ON client_custom_fields;
DROP POLICY IF EXISTS "org_managers_insert_custom_fields" ON client_custom_fields;
DROP POLICY IF EXISTS "org_managers_update_custom_fields" ON client_custom_fields;
DROP POLICY IF EXISTS "org_managers_delete_custom_fields" ON client_custom_fields;

CREATE POLICY "org_members_select_custom_fields" ON client_custom_fields
  FOR SELECT TO authenticated USING (is_org_member(org_id));

CREATE POLICY "org_managers_insert_custom_fields" ON client_custom_fields
  FOR INSERT TO authenticated WITH CHECK (is_org_manager(org_id));

CREATE POLICY "org_managers_update_custom_fields" ON client_custom_fields
  FOR UPDATE TO authenticated
  USING (is_org_manager(org_id)) WITH CHECK (is_org_manager(org_id));

CREATE POLICY "org_managers_delete_custom_fields" ON client_custom_fields
  FOR DELETE TO authenticated USING (is_org_manager(org_id));

-- ──────────────────────────────────────────
-- client_custom_values
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_custom_values (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  org_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  field_key  text        NOT NULL,
  value      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, field_key)
);

ALTER TABLE client_custom_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_select_custom_values" ON client_custom_values;
DROP POLICY IF EXISTS "org_members_insert_custom_values" ON client_custom_values;
DROP POLICY IF EXISTS "org_members_update_custom_values" ON client_custom_values;
DROP POLICY IF EXISTS "org_members_delete_custom_values" ON client_custom_values;

CREATE POLICY "org_members_select_custom_values" ON client_custom_values
  FOR SELECT TO authenticated
  USING (
    is_org_member(org_id) AND (
      is_org_manager(org_id) OR
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_id
          AND (c.assigned_to = auth.uid() OR c.user_id = auth.uid())
      )
    )
  );

CREATE POLICY "org_members_insert_custom_values" ON client_custom_values
  FOR INSERT TO authenticated WITH CHECK (is_org_member(org_id));

CREATE POLICY "org_members_update_custom_values" ON client_custom_values
  FOR UPDATE TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "org_members_delete_custom_values" ON client_custom_values
  FOR DELETE TO authenticated USING (is_org_member(org_id));

-- ──────────────────────────────────────────
-- client_activity_log
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_activity_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  client_id    uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  performed_by uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  action       text        NOT NULL,
  detail       jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view_activity_log"   ON client_activity_log;
DROP POLICY IF EXISTS "insert_activity_log" ON client_activity_log;

CREATE POLICY "view_activity_log" ON client_activity_log
  FOR SELECT TO authenticated
  USING (
    (org_id IS NULL AND performed_by = auth.uid()) OR
    (org_id IS NOT NULL AND is_org_member(org_id))
  );

CREATE POLICY "insert_activity_log" ON client_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (performed_by = auth.uid());

-- ──────────────────────────────────────────
-- clients: update RLS policies
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own clients"   ON clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

CREATE POLICY "select_clients" ON clients
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      -- personal
      (org_id IS NULL AND user_id = auth.uid()) OR
      -- org: assignee or manager/owner
      (org_id IS NOT NULL AND is_org_member(org_id) AND (
        assigned_to = auth.uid() OR
        user_id     = auth.uid() OR
        is_org_manager(org_id)
      ))
    )
  );

CREATE POLICY "insert_clients" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      org_id IS NULL OR is_org_member(org_id)
    )
  );

CREATE POLICY "update_clients" ON clients
  FOR UPDATE TO authenticated
  USING (
    (org_id IS NULL AND user_id = auth.uid()) OR
    (org_id IS NOT NULL AND is_org_member(org_id) AND (
      assigned_to = auth.uid() OR
      user_id     = auth.uid() OR
      is_org_manager(org_id)
    ))
  )
  WITH CHECK (
    (org_id IS NULL AND user_id = auth.uid()) OR
    (org_id IS NOT NULL AND is_org_member(org_id) AND (
      assigned_to = auth.uid() OR
      user_id     = auth.uid() OR
      is_org_manager(org_id)
    ))
  );

CREATE POLICY "delete_clients" ON clients
  FOR DELETE TO authenticated
  USING (
    (org_id IS NULL AND user_id = auth.uid()) OR
    (org_id IS NOT NULL AND is_org_manager(org_id))
  );

-- ──────────────────────────────────────────
-- client_interactions: update RLS policies
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own client interactions"   ON client_interactions;
DROP POLICY IF EXISTS "Users can insert own client interactions" ON client_interactions;
DROP POLICY IF EXISTS "Users can update own client interactions" ON client_interactions;
DROP POLICY IF EXISTS "Users can delete own client interactions" ON client_interactions;

CREATE POLICY "select_client_interactions" ON client_interactions
  FOR SELECT TO authenticated
  USING (
    (org_id IS NULL AND user_id = auth.uid()) OR
    (org_id IS NOT NULL AND is_org_member(org_id) AND (
      user_id = auth.uid() OR
      is_org_manager(org_id) OR
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_id
          AND (c.assigned_to = auth.uid() OR c.user_id = auth.uid())
      )
    ))
  );

CREATE POLICY "insert_client_interactions" ON client_interactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      org_id IS NULL OR is_org_member(org_id)
    )
  );

CREATE POLICY "update_client_interactions" ON client_interactions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_client_interactions" ON client_interactions
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    (org_id IS NOT NULL AND is_org_manager(org_id))
  );

-- ──────────────────────────────────────────
-- client_grades: update RLS policies
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own client grades"   ON client_grades;
DROP POLICY IF EXISTS "Users can insert own client grades" ON client_grades;
DROP POLICY IF EXISTS "Users can update own client grades" ON client_grades;
DROP POLICY IF EXISTS "Users can delete own client grades" ON client_grades;

CREATE POLICY "select_client_grades" ON client_grades
  FOR SELECT TO authenticated
  USING (
    (org_id IS NULL AND user_id = auth.uid()) OR
    (org_id IS NOT NULL AND is_org_member(org_id) AND (
      user_id = auth.uid() OR
      is_org_manager(org_id) OR
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = client_id
          AND (c.assigned_to = auth.uid() OR c.user_id = auth.uid())
      )
    ))
  );

CREATE POLICY "insert_client_grades" ON client_grades
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_client_grades" ON client_grades
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_client_grades" ON client_grades
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    (org_id IS NOT NULL AND is_org_manager(org_id))
  );

-- indexes for new columns
CREATE INDEX IF NOT EXISTS idx_clients_org_id     ON clients (org_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients (assigned_to);
CREATE INDEX IF NOT EXISTS idx_client_interactions_org_id ON client_interactions (org_id);
CREATE INDEX IF NOT EXISTS idx_client_grades_org_id ON client_grades (org_id);
CREATE INDEX IF NOT EXISTS idx_custom_values_client ON client_custom_values (client_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_client  ON client_activity_log (client_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_org     ON client_activity_log (org_id);
