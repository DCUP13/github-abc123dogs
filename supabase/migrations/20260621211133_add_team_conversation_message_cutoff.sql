-- Add per-user message cutoff timestamps.
-- cleared_at_pX records when that participant deleted the conversation.
-- Messages created before this timestamp are excluded from their view.

ALTER TABLE team_conversations
  ADD COLUMN IF NOT EXISTS cleared_at_p1 timestamptz,
  ADD COLUMN IF NOT EXISTS cleared_at_p2 timestamptz;
