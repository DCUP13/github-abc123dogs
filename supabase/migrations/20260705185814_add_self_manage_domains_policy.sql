
-- Allow users to always insert and update their own domains (self-management),
-- mirroring the existing self-management policies on amazon_ses_emails / google_smtp_emails.

DROP POLICY IF EXISTS "Managers can create member domains" ON amazon_ses_domains;
CREATE POLICY "Managers can create member domains"
  ON amazon_ses_domains FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR can_manage_user_resources(user_id)
  );

DROP POLICY IF EXISTS "Managers can update member domains" ON amazon_ses_domains;
CREATE POLICY "Managers can update member domains"
  ON amazon_ses_domains FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR can_manage_user_resources(user_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR can_manage_user_resources(user_id)
  );

-- Also allow users to delete their own domains (currently only managers can delete)
DROP POLICY IF EXISTS "Managers can delete member domains" ON amazon_ses_domains;
CREATE POLICY "Managers can delete member domains"
  ON amazon_ses_domains FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
        AND om1.role IN ('owner', 'manager')
        AND om2.user_id = amazon_ses_domains.user_id
    )
  );
