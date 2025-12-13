/*
  # Allow Managers and Owners to Edit Member Settings
  
  1. Changes
    - Add RLS policies to allow organization managers/owners to view and edit member settings
    - Applies to tables: user_settings, amazon_ses_settings, google_smtp_settings, rapid_api_settings
    - Applies to tables: amazon_ses_emails, google_smtp_emails, dashboard_statistics
    - Managers/owners can only manage members in their own organization
  
  2. Security
    - Maintain existing user policies (users can still manage their own data)
    - Add new policies for organization managers/owners
    - Verify organization membership before allowing access
*/

-- user_settings: Allow managers/owners to view and edit member settings
CREATE POLICY "Managers can view member settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = user_settings.user_id
    )
  );

CREATE POLICY "Managers can update member settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = user_settings.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = user_settings.user_id
    )
  );

CREATE POLICY "Managers can create member settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = user_settings.user_id
    )
  );

-- amazon_ses_settings: Allow managers/owners to manage
CREATE POLICY "Managers can view member SES settings"
  ON amazon_ses_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_settings.user_id
    )
  );

CREATE POLICY "Managers can update member SES settings"
  ON amazon_ses_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_settings.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_settings.user_id
    )
  );

CREATE POLICY "Managers can create member SES settings"
  ON amazon_ses_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_settings.user_id
    )
  );

-- google_smtp_settings: Allow managers/owners to manage
CREATE POLICY "Managers can view member Google settings"
  ON google_smtp_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = google_smtp_settings.user_id
    )
  );

CREATE POLICY "Managers can update member Google settings"
  ON google_smtp_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = google_smtp_settings.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = google_smtp_settings.user_id
    )
  );

CREATE POLICY "Managers can create member Google settings"
  ON google_smtp_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = google_smtp_settings.user_id
    )
  );

-- rapid_api_settings: Allow managers/owners to manage
CREATE POLICY "Managers can view member RapidAPI settings"
  ON rapid_api_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = rapid_api_settings.user_id
    )
  );

CREATE POLICY "Managers can update member RapidAPI settings"
  ON rapid_api_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = rapid_api_settings.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = rapid_api_settings.user_id
    )
  );

CREATE POLICY "Managers can create member RapidAPI settings"
  ON rapid_api_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = rapid_api_settings.user_id
    )
  );

-- amazon_ses_emails: Allow managers/owners to manage
CREATE POLICY "Managers can view member SES emails"
  ON amazon_ses_emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_emails.user_id
    )
  );

CREATE POLICY "Managers can update member SES emails"
  ON amazon_ses_emails FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_emails.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_emails.user_id
    )
  );

CREATE POLICY "Managers can create member SES emails"
  ON amazon_ses_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_emails.user_id
    )
  );

CREATE POLICY "Managers can delete member SES emails"
  ON amazon_ses_emails FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_emails.user_id
    )
  );

-- google_smtp_emails: Allow managers/owners to manage
CREATE POLICY "Managers can view member Google emails"
  ON google_smtp_emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = google_smtp_emails.user_id
    )
  );

CREATE POLICY "Managers can update member Google emails"
  ON google_smtp_emails FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = google_smtp_emails.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = google_smtp_emails.user_id
    )
  );

CREATE POLICY "Managers can create member Google emails"
  ON google_smtp_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = google_smtp_emails.user_id
    )
  );

CREATE POLICY "Managers can delete member Google emails"
  ON google_smtp_emails FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = google_smtp_emails.user_id
    )
  );

-- dashboard_statistics: Allow managers/owners to view
CREATE POLICY "Managers can view member statistics"
  ON dashboard_statistics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = dashboard_statistics.user_id
    )
  );

-- profiles: Allow managers/owners to view member profiles
CREATE POLICY "Managers can view member profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = profiles.id
    )
  );