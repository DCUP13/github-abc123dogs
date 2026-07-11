/*
# Shared Prompts and Email Templates - Part 1

Adds platform owner flag, email template columns on prompts, and the two shared-prompts tables
(without the cross-table RLS policy that requires shared_prompt_orgs to already exist).
*/

-- ============================================================
-- 1. Platform owner flag on profiles
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_platform_owner'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_platform_owner boolean NOT NULL DEFAULT false;
  END IF;
END $$;

UPDATE profiles
SET is_platform_owner = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'devoncadvertising@gmail.com'
);

-- Allow any authenticated user to read profiles (needed to show sharer names)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 2. Email template columns on prompts
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts' AND column_name = 'response_mode'
  ) THEN
    ALTER TABLE prompts
      ADD COLUMN response_mode text NOT NULL DEFAULT 'ai'
        CHECK (response_mode IN ('ai', 'template', 'intelligent_template'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts' AND column_name = 'template_subject'
  ) THEN
    ALTER TABLE prompts ADD COLUMN template_subject text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts' AND column_name = 'template_body'
  ) THEN
    ALTER TABLE prompts ADD COLUMN template_body text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts' AND column_name = 'template_ai_instructions'
  ) THEN
    ALTER TABLE prompts ADD COLUMN template_ai_instructions text;
  END IF;
END $$;

-- ============================================================
-- 3. shared_prompts table (no cross-table policy yet)
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('global', 'organization', 'team')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(prompt_id, shared_by)
);

ALTER TABLE shared_prompts ENABLE ROW LEVEL SECURITY;

-- INSERT: you must own the prompt
DROP POLICY IF EXISTS "insert_shared_prompts" ON shared_prompts;
CREATE POLICY "insert_shared_prompts" ON shared_prompts FOR INSERT
  TO authenticated
  WITH CHECK (
    shared_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM prompts WHERE id = prompt_id AND user_id = auth.uid()
    )
  );

-- DELETE: only sharer or platform owner
DROP POLICY IF EXISTS "delete_shared_prompts" ON shared_prompts;
CREATE POLICY "delete_shared_prompts" ON shared_prompts FOR DELETE
  TO authenticated
  USING (
    shared_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_owner = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_shared_prompts_shared_by ON shared_prompts(shared_by);
CREATE INDEX IF NOT EXISTS idx_shared_prompts_scope ON shared_prompts(scope);
CREATE INDEX IF NOT EXISTS idx_shared_prompts_prompt_id ON shared_prompts(prompt_id);

-- ============================================================
-- 4. shared_prompt_orgs table
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_prompt_orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_prompt_id uuid NOT NULL REFERENCES shared_prompts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(shared_prompt_id, organization_id)
);

ALTER TABLE shared_prompt_orgs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_shared_prompt_orgs" ON shared_prompt_orgs;
CREATE POLICY "select_shared_prompt_orgs" ON shared_prompt_orgs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_prompts sp
      WHERE sp.id = shared_prompt_id
        AND (
          sp.shared_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM organization_members
            WHERE user_id = auth.uid()
              AND organization_id = shared_prompt_orgs.organization_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "insert_shared_prompt_orgs" ON shared_prompt_orgs;
CREATE POLICY "insert_shared_prompt_orgs" ON shared_prompt_orgs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_prompts WHERE id = shared_prompt_id AND shared_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_shared_prompt_orgs" ON shared_prompt_orgs;
CREATE POLICY "delete_shared_prompt_orgs" ON shared_prompt_orgs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_prompts WHERE id = shared_prompt_id AND shared_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_platform_owner = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_shared_prompt_orgs_sp ON shared_prompt_orgs(shared_prompt_id);
CREATE INDEX IF NOT EXISTS idx_shared_prompt_orgs_org ON shared_prompt_orgs(organization_id);
