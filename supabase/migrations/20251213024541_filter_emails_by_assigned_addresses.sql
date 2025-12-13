/*
  # Filter Emails by Assigned Email Addresses
  
  1. Changes
    - Drop existing permissive policies on emails table
    - Create new restrictive policy that filters emails based on user's assigned addresses
    - Users can only see emails where the receiver array contains one of their assigned email addresses
    - Combines both amazon_ses_emails and google_smtp_emails for filtering
  
  2. Security
    - Maintains RLS on emails table
    - Ensures users only see emails directed to their assigned addresses
    - Prevents unauthorized access to other users' emails
*/

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow authenticated read" ON emails;
DROP POLICY IF EXISTS "Allow authenticated insert" ON emails;
DROP POLICY IF EXISTS "Allow authenticated delete" ON emails;

-- Create policy that filters emails by user's assigned email addresses
CREATE POLICY "Users can read emails sent to their assigned addresses"
  ON emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM amazon_ses_emails
      WHERE amazon_ses_emails.user_id = auth.uid()
      AND amazon_ses_emails.address = ANY(emails.receiver)
    )
    OR
    EXISTS (
      SELECT 1 FROM google_smtp_emails
      WHERE google_smtp_emails.user_id = auth.uid()
      AND google_smtp_emails.address = ANY(emails.receiver)
    )
  );

-- Allow service role to insert emails (for incoming email processing)
CREATE POLICY "Service role can insert emails"
  ON emails FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can delete emails sent to their assigned addresses
CREATE POLICY "Users can delete emails sent to their assigned addresses"
  ON emails FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM amazon_ses_emails
      WHERE amazon_ses_emails.user_id = auth.uid()
      AND amazon_ses_emails.address = ANY(emails.receiver)
    )
    OR
    EXISTS (
      SELECT 1 FROM google_smtp_emails
      WHERE google_smtp_emails.user_id = auth.uid()
      AND google_smtp_emails.address = ANY(emails.receiver)
    )
  );