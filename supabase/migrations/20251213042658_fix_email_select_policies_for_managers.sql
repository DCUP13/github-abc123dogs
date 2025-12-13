/*
  # Fix Email SELECT Policies for Managers

  1. Changes
    - Update SELECT policies for amazon_ses_emails and google_smtp_emails
    - Allow users to view their own emails AND managers to view member emails
    - Use the helper function for consistent evaluation

  2. Security
    - Uses the can_manage_user_resources helper function
    - Maintains existing permission structure
    - Users can view their own emails
    - Managers can view member emails
*/

-- Drop and recreate SELECT policy for amazon_ses_emails
DROP POLICY IF EXISTS "Users can read own SES emails" ON amazon_ses_emails;
DROP POLICY IF EXISTS "Managers can view member SES emails" ON amazon_ses_emails;

CREATE POLICY "Users can view assigned SES emails"
  ON amazon_ses_emails
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR can_manage_user_resources(user_id)
  );

-- Update UPDATE policy to use helper function
DROP POLICY IF EXISTS "Managers can update member SES emails" ON amazon_ses_emails;

CREATE POLICY "Managers can update member SES emails"
  ON amazon_ses_emails
  FOR UPDATE
  TO authenticated
  USING (can_manage_user_resources(user_id))
  WITH CHECK (can_manage_user_resources(user_id));

-- Update DELETE policy to use helper function
DROP POLICY IF EXISTS "Managers can delete member SES emails" ON amazon_ses_emails;

CREATE POLICY "Managers can delete member SES emails"
  ON amazon_ses_emails
  FOR DELETE
  TO authenticated
  USING (can_manage_user_resources(user_id));

-- Drop and recreate SELECT policy for google_smtp_emails
DROP POLICY IF EXISTS "Users can read own SMTP emails" ON google_smtp_emails;
DROP POLICY IF EXISTS "Managers can view member Google emails" ON google_smtp_emails;

CREATE POLICY "Users can view assigned SMTP emails"
  ON google_smtp_emails
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR can_manage_user_resources(user_id)
  );

-- Update UPDATE policy to use helper function
DROP POLICY IF EXISTS "Managers can update member Google emails" ON google_smtp_emails;

CREATE POLICY "Managers can update member SMTP emails"
  ON google_smtp_emails
  FOR UPDATE
  TO authenticated
  USING (can_manage_user_resources(user_id))
  WITH CHECK (can_manage_user_resources(user_id));

-- Update DELETE policy to use helper function
DROP POLICY IF EXISTS "Managers can delete member Google emails" ON google_smtp_emails;

CREATE POLICY "Managers can delete member SMTP emails"
  ON google_smtp_emails
  FOR DELETE
  TO authenticated
  USING (can_manage_user_resources(user_id));
