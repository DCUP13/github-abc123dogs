/*
  # Update Emails RLS for Master Inbox Mode

  1. Changes
    - Drop existing "Users can read emails sent to their assigned addresses" policy
    - Create new policy that supports both regular and master inbox modes
      - Regular mode: Users see emails sent to their assigned addresses only
      - Master mode: Managers see ALL emails for domains in their organization

  2. Security
    - Members always see only their assigned emails
    - Managers can toggle between seeing only their emails or all organization emails
    - Policy checks user_settings.inbox_mode to determine filtering
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can read emails sent to their assigned addresses" ON emails;

-- Create new policy with master inbox support
CREATE POLICY "Users can read emails based on inbox mode and role"
  ON emails
  FOR SELECT
  TO authenticated
  USING (
    -- Case 1: User can see emails sent to their own assigned addresses (all users, all modes)
    (
      EXISTS (
        SELECT 1
        FROM amazon_ses_emails
        WHERE amazon_ses_emails.user_id = auth.uid()
        AND amazon_ses_emails.address = ANY (emails.receiver)
      )
      OR EXISTS (
        SELECT 1
        FROM google_smtp_emails
        WHERE google_smtp_emails.user_id = auth.uid()
        AND google_smtp_emails.address = ANY (emails.receiver)
      )
    )
    OR
    -- Case 2: Manager/Owner in master inbox mode can see ALL emails for domains in their organization
    (
      EXISTS (
        SELECT 1
        FROM organization_members om
        JOIN user_settings us ON us.user_id = auth.uid()
        WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'manager')
        AND us.inbox_mode = 'master'
        AND EXISTS (
          -- Check if any receiver address belongs to a domain in the organization
          SELECT 1
          FROM amazon_ses_domains d
          JOIN organization_members om2 ON om2.organization_id = om.organization_id
          WHERE d.user_id = om2.user_id
          AND EXISTS (
            SELECT 1
            FROM unnest(emails.receiver) AS r
            WHERE r LIKE '%@' || d.domain
          )
        )
      )
    )
  );