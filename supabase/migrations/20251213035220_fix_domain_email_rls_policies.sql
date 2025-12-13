/*
  # Fix RLS Policies for Domain and Email Management

  1. Changes
    - Create helper function to check if user can manage another user's resources
    - Recreate INSERT policies using the helper function for better reliability
    - This fixes issues with WITH CHECK clause evaluation during INSERT operations

  2. Security
    - Maintains strict RLS policies
    - Only allows managers/owners to manage member resources
    - Uses a function for more reliable policy evaluation
*/

-- Create helper function to check if user can manage resources for another user
CREATE OR REPLACE FUNCTION can_manage_user_resources(target_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid()
    AND om1.role IN ('owner', 'manager')
    AND om2.user_id = target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate INSERT policy for amazon_ses_domains
DROP POLICY IF EXISTS "Managers can create member domains" ON amazon_ses_domains;

CREATE POLICY "Managers can create member domains"
  ON amazon_ses_domains FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_user_resources(user_id));

-- Drop and recreate INSERT policy for amazon_ses_emails
DROP POLICY IF EXISTS "Managers can create member SES emails" ON amazon_ses_emails;

CREATE POLICY "Managers can create member SES emails"
  ON amazon_ses_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    can_manage_user_resources(user_id) OR auth.uid() = user_id
  );

-- Drop and recreate INSERT policy for google_smtp_emails
DROP POLICY IF EXISTS "Managers can create member Google emails" ON google_smtp_emails;

CREATE POLICY "Managers can create member Google emails"
  ON google_smtp_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    can_manage_user_resources(user_id) OR auth.uid() = user_id
  );
