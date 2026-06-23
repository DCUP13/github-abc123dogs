/*
# Auto-delete messages when both participants have cleared the conversation

## Purpose
When a user deletes a conversation, their `cleared_at_p1` or `cleared_at_p2` timestamp is
set to mark the point up to which they no longer want to see messages. However, the messages
themselves remain in the database indefinitely.

This migration adds a trigger that fires whenever `team_conversations` is updated. If both
`cleared_at_p1` and `cleared_at_p2` are non-null (meaning both participants have independently
cleared the conversation at some point), it hard-deletes all `team_messages` rows whose
`created_at` falls at or before the EARLIER of the two cutoff timestamps.

Messages that only one participant has cleared are kept intact — they are still visible to
the other participant.

## Changes

### New function
- `cleanup_messages_after_both_cleared()` — PL/pgSQL trigger function. Checks both cutoffs
  and deletes the overlap (messages before `LEAST(cleared_at_p1, cleared_at_p2)`).

### New trigger
- `trg_cleanup_messages_on_both_cleared` on `team_conversations`
  - Fires: AFTER UPDATE, FOR EACH ROW
  - Condition: both NEW.cleared_at_p1 and NEW.cleared_at_p2 are NOT NULL

## Notes
1. Only hard-deletes messages up to the MINIMUM of the two cutoffs, so any messages the
   other participant can still see are never touched.
2. The trigger is row-level; it operates only on the conversation being updated.
3. Safe to re-run: uses CREATE OR REPLACE for the function and DROP/CREATE for the trigger.
4. No application-layer changes required — the cleanup is fully transparent.
*/

CREATE OR REPLACE FUNCTION cleanup_messages_after_both_cleared()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.cleared_at_p1 IS NOT NULL AND NEW.cleared_at_p2 IS NOT NULL THEN
    DELETE FROM team_messages
    WHERE conversation_id = NEW.id
      AND created_at <= LEAST(NEW.cleared_at_p1, NEW.cleared_at_p2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_messages_on_both_cleared ON team_conversations;
CREATE TRIGGER trg_cleanup_messages_on_both_cleared
  AFTER UPDATE ON team_conversations
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_messages_after_both_cleared();
