-- Atomically claims outbox emails by updating status to 'sending' in one statement,
-- preventing duplicate processing when multiple callers run concurrently.
CREATE OR REPLACE FUNCTION claim_outbox_emails(p_email_id uuid DEFAULT NULL)
RETURNS SETOF email_outbox
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF p_email_id IS NOT NULL THEN
    -- Claim a specific email: only succeeds if it is still pending
    RETURN QUERY
      UPDATE email_outbox
      SET status = 'sending', updated_at = now()
      WHERE id = p_email_id AND status = 'pending'
      RETURNING *;
  ELSE
    -- Claim up to 10 pending emails; FOR UPDATE SKIP LOCKED prevents duplicate claims
    RETURN QUERY
      UPDATE email_outbox
      SET status = 'sending', updated_at = now()
      WHERE id IN (
        SELECT id FROM email_outbox
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT 10
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
  END IF;
END;
$$;
