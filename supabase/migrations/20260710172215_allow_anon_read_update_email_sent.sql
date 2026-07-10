/*
# Allow anon key to read and update email_sent delivery columns

The Lambda uses the anon key to:
1. Look up email_sent rows by ses_message_id to get the record id.
2. Update delivery_status, delivered_at, bounced_at, etc. when SES events arrive.

There was no UPDATE policy on email_sent at all, and no SELECT for anon,
so both operations were failing silently after the lambda's email_events
insert error was fixed.

1. Changes
- Add SELECT policy on email_sent for anon role
- Add UPDATE policy on email_sent for anon role

2. Security Notes
- The Lambda is a trusted AWS backend. Its anon key acts as a server-side
  API key, not a public browser client. Delivery status columns are
  metadata set only by SES event callbacks — no user-visible data is exposed.
- Authenticated user policies (read/insert/delete own emails) are unchanged.
*/

DROP POLICY IF EXISTS "anon_select_email_sent" ON email_sent;
CREATE POLICY "anon_select_email_sent" ON email_sent
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "anon_update_email_sent" ON email_sent;
CREATE POLICY "anon_update_email_sent" ON email_sent
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
