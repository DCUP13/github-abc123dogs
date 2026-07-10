-- SELECT: users can read events for emails they sent
CREATE POLICY "select_own_email_events" ON email_events FOR SELECT
  TO authenticated
  USING (
    email_sent_id IN (
      SELECT id FROM email_sent WHERE user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: blocked for clients; only service role (edge function) writes here
