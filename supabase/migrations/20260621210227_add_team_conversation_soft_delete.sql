-- Per-user soft delete for team conversations.
-- Each participant can independently hide a conversation from their sidebar.
-- When a new message is sent, both flags reset so the conversation reappears for everyone.

ALTER TABLE team_conversations
  ADD COLUMN IF NOT EXISTS hidden_for_p1 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_for_p2 boolean NOT NULL DEFAULT false;
