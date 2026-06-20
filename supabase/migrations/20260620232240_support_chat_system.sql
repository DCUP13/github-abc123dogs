-- Add support_admin flag to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS support_admin boolean NOT NULL DEFAULT false;

-- Auto-identify the LoiReply operator by their noreply domain
UPDATE user_settings
SET support_admin = true
WHERE user_id IN (
  SELECT user_id FROM amazon_ses_settings WHERE noreply_domain = 'loireply.com'
);

-- Add user_id and status to support_requests
ALTER TABLE support_requests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

-- Drop the old blanket service_role policy; replace with proper per-role policies
DROP POLICY IF EXISTS "service_role_all" ON support_requests;

CREATE POLICY "select_support_requests" ON support_requests
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_settings.user_id = auth.uid()
      AND user_settings.support_admin = true
    )
  );

CREATE POLICY "insert_support_requests" ON support_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_support_requests" ON support_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_settings.user_id = auth.uid()
      AND user_settings.support_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_settings
      WHERE user_settings.user_id = auth.uid()
      AND user_settings.support_admin = true
    )
  );

-- support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES support_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  is_owner boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_support_messages" ON support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM support_requests r
      WHERE r.id = request_id
      AND (
        r.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_settings
          WHERE user_settings.user_id = auth.uid()
          AND user_settings.support_admin = true
        )
      )
    )
  );

CREATE POLICY "insert_support_messages" ON support_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- Enable realtime on support tables
ALTER PUBLICATION supabase_realtime ADD TABLE support_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
