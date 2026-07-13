-- 1. allow_member_add_clients on organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS allow_member_add_clients boolean NOT NULL DEFAULT true;

-- 2. Personal custom fields (user-scoped)
CREATE TABLE IF NOT EXISTS user_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text' CHECK (field_type IN ('text','number','date','dropdown','boolean')),
  options jsonb DEFAULT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, field_key)
);
ALTER TABLE user_custom_fields ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_custom_fields' AND policyname='select_own_ucf') THEN
    CREATE POLICY "select_own_ucf" ON user_custom_fields FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_custom_fields' AND policyname='insert_own_ucf') THEN
    CREATE POLICY "insert_own_ucf" ON user_custom_fields FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_custom_fields' AND policyname='update_own_ucf') THEN
    CREATE POLICY "update_own_ucf" ON user_custom_fields FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_custom_fields' AND policyname='delete_own_ucf') THEN
    CREATE POLICY "delete_own_ucf" ON user_custom_fields FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Personal custom field values
CREATE TABLE IF NOT EXISTS user_custom_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id, field_key)
);
ALTER TABLE user_custom_values ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_custom_values' AND policyname='select_own_ucv') THEN
    CREATE POLICY "select_own_ucv" ON user_custom_values FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_custom_values' AND policyname='insert_own_ucv') THEN
    CREATE POLICY "insert_own_ucv" ON user_custom_values FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_custom_values' AND policyname='update_own_ucv') THEN
    CREATE POLICY "update_own_ucv" ON user_custom_values FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_custom_values' AND policyname='delete_own_ucv') THEN
    CREATE POLICY "delete_own_ucv" ON user_custom_values FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. CRM Campaigns
CREATE TABLE IF NOT EXISTS crm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_id uuid,
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  filter_json jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','complete','cancelled')),
  total_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_campaigns' AND policyname='select_own_campaigns') THEN
    CREATE POLICY "select_own_campaigns" ON crm_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_campaigns' AND policyname='insert_own_campaigns') THEN
    CREATE POLICY "insert_own_campaigns" ON crm_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_campaigns' AND policyname='update_own_campaigns') THEN
    CREATE POLICY "update_own_campaigns" ON crm_campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_campaigns' AND policyname='delete_own_campaigns') THEN
    CREATE POLICY "delete_own_campaigns" ON crm_campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Campaign contact tracking
CREATE TABLE IF NOT EXISTS crm_campaign_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','skipped','failed')),
  skip_reason text,
  sent_at timestamptz,
  UNIQUE (campaign_id, client_id)
);
ALTER TABLE crm_campaign_contacts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_campaign_contacts' AND policyname='select_own_ccc') THEN
    CREATE POLICY "select_own_ccc" ON crm_campaign_contacts FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM crm_campaigns WHERE id = campaign_id AND user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_campaign_contacts' AND policyname='insert_own_ccc') THEN
    CREATE POLICY "insert_own_ccc" ON crm_campaign_contacts FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM crm_campaigns WHERE id = campaign_id AND user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_campaign_contacts' AND policyname='update_own_ccc') THEN
    CREATE POLICY "update_own_ccc" ON crm_campaign_contacts FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM crm_campaigns WHERE id = campaign_id AND user_id = auth.uid()));
  END IF;
END $$;

-- 6. Link email_outbox rows to campaigns
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS campaign_id uuid;
