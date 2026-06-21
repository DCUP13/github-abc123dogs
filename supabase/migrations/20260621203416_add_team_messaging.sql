-- Team direct message conversations
CREATE TABLE IF NOT EXISTS team_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_conv_ordered CHECK (participant_1::text < participant_2::text),
  CONSTRAINT team_conv_unique UNIQUE (participant_1, participant_2)
);

-- Messages within a team conversation
CREATE TABLE IF NOT EXISTS team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES team_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_conv_p1 ON team_conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_team_conv_p2 ON team_conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_team_conv_org ON team_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_conv_last_msg ON team_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_msgs_conv ON team_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_team_msgs_created ON team_messages(created_at);

-- RLS
ALTER TABLE team_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: participants can view
CREATE POLICY "select_team_conversations" ON team_conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Conversations: can only create if both participants share an org
-- Admins (owner/manager) can message anyone in their org; members can only message same-org members
CREATE POLICY "insert_team_conversations" ON team_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = participant_1 OR auth.uid() = participant_2)
    AND EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = participant_1 AND om2.user_id = participant_2
    )
  );

-- Conversations: participants can update (for last_message_at)
CREATE POLICY "update_team_conversations" ON team_conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2)
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Messages: visible to conversation participants
CREATE POLICY "select_team_messages" ON team_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_conversations tc
      WHERE tc.id = conversation_id
        AND (tc.participant_1 = auth.uid() OR tc.participant_2 = auth.uid())
    )
  );

-- Messages: sender must be a participant and must be the auth user
CREATE POLICY "insert_team_messages" ON team_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_conversations tc
      WHERE tc.id = conversation_id
        AND (tc.participant_1 = auth.uid() OR tc.participant_2 = auth.uid())
    )
  );
