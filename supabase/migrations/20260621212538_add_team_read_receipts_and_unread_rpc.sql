-- Per-user read timestamps for unread tracking
ALTER TABLE team_conversations
  ADD COLUMN IF NOT EXISTS last_read_at_p1 timestamptz,
  ADD COLUMN IF NOT EXISTS last_read_at_p2 timestamptz;

-- Efficient unread count RPC used by the sidebar badge
CREATE OR REPLACE FUNCTION get_team_unread_count(uid uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE((
    SELECT COUNT(*)::integer
    FROM team_messages tm
    JOIN team_conversations tc ON tm.conversation_id = tc.id
    WHERE tm.sender_id != uid
      AND (
        (tc.participant_1 = uid
          AND tc.hidden_for_p1 = false
          AND tm.created_at > COALESCE(
            GREATEST(tc.last_read_at_p1, tc.cleared_at_p1),
            '1970-01-01'::timestamptz
          ))
        OR
        (tc.participant_2 = uid
          AND tc.hidden_for_p2 = false
          AND tm.created_at > COALESCE(
            GREATEST(tc.last_read_at_p2, tc.cleared_at_p2),
            '1970-01-01'::timestamptz
          ))
      )
  ), 0)
$$;

GRANT EXECUTE ON FUNCTION get_team_unread_count(uuid) TO authenticated;
