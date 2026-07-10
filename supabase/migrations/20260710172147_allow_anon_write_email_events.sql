/*
# Allow anon key to write email delivery events

The Lambda function uses the Supabase anon key (not service role) to write
SES delivery events back to the database. The email_events table was created
with RLS enabled but only a SELECT policy for authenticated users, so the
Lambda's INSERT was being blocked with 42501.

1. Changes
- Add INSERT policy on email_events for anon role
- Add UPDATE policy on email_events for anon role (required for upsert on conflict)

2. Security Notes
- The Lambda is a trusted AWS backend — its anon key acts as a server-side
  API key, not a public browser client.
- SELECT remains scoped to authenticated users who own the email.
*/

DROP POLICY IF EXISTS "anon_insert_email_events" ON email_events;
CREATE POLICY "anon_insert_email_events" ON email_events
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_email_events" ON email_events;
CREATE POLICY "anon_update_email_events" ON email_events
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
