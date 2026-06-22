
-- RPC to mark a conversation as read for the calling user.
-- Uses server-side auth.uid() and NOW() to avoid any client-side issues.
CREATE OR REPLACE FUNCTION mark_conversation_read(conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE team_conversations
  SET
    last_read_at_p1 = CASE WHEN participant_1 = auth.uid() THEN NOW() ELSE last_read_at_p1 END,
    last_read_at_p2 = CASE WHEN participant_2 = auth.uid() THEN NOW() ELSE last_read_at_p2 END
  WHERE id = conv_id
    AND (participant_1 = auth.uid() OR participant_2 = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION mark_conversation_read(uuid) TO authenticated;
