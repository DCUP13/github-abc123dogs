CREATE TABLE IF NOT EXISTS crm_outreach_dismissed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

ALTER TABLE crm_outreach_dismissed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_dismissed" ON crm_outreach_dismissed FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_dismissed" ON crm_outreach_dismissed FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_dismissed" ON crm_outreach_dismissed FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
