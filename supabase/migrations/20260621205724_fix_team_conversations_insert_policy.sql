-- Fix: replace complex EXISTS JOIN with a simple participant check
-- The original INSERT policy caused RLS recursion on organization_members

DROP POLICY IF EXISTS "insert_team_conversations" ON team_conversations;

CREATE POLICY "insert_team_conversations" ON team_conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Enable realtime so new messages and conversation updates are pushed to clients
ALTER PUBLICATION supabase_realtime ADD TABLE team_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;
