/*
  # Restrict Domain Management to Managers/Owners Only
  
  1. Changes
    - Drop existing policies that allow all users to manage domains
    - Create new restrictive policies for amazon_ses_domains:
      * Only organization owners and managers can insert domains for members
      * Only organization owners and managers can update domains for members
      * Only organization owners and managers can delete domains for members
      * All users can still view domains assigned to them (needed for functionality)
    - Members can no longer create, update, or delete their own domains
  
  2. Security
    - Maintains RLS on amazon_ses_domains
    - Ensures proper organization membership verification
    - Prevents members from self-managing domains
*/

-- Drop existing policies that allow users to manage their own domains
DROP POLICY IF EXISTS "Users can insert own domains" ON amazon_ses_domains;
DROP POLICY IF EXISTS "Users can update own domains" ON amazon_ses_domains;
DROP POLICY IF EXISTS "Users can delete own domains" ON amazon_ses_domains;

-- Keep read policy but make it more permissive (users can read domains assigned to them)
DROP POLICY IF EXISTS "Users can read own domains" ON amazon_ses_domains;

CREATE POLICY "Users can read assigned domains"
  ON amazon_ses_domains FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Managers can view member domains
CREATE POLICY "Managers can view member domains"
  ON amazon_ses_domains FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_domains.user_id
    )
  );

-- Only managers/owners can create domains for members
CREATE POLICY "Managers can create member domains"
  ON amazon_ses_domains FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_domains.user_id
    )
  );

-- Only managers/owners can update domains
CREATE POLICY "Managers can update member domains"
  ON amazon_ses_domains FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_domains.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_domains.user_id
    )
  );

-- Only managers/owners can delete domains
CREATE POLICY "Managers can delete member domains"
  ON amazon_ses_domains FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
      AND om1.role IN ('owner', 'manager')
      AND om2.user_id = amazon_ses_domains.user_id
    )
  );