-- Update claim_outbox_emails to respect send_after scheduling for sequenced sends.
CREATE OR REPLACE FUNCTION claim_outbox_emails(p_email_id uuid DEFAULT NULL)
RETURNS SETOF email_outbox
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF p_email_id IS NOT NULL THEN
    RETURN QUERY
      UPDATE email_outbox
      SET status = 'sending', updated_at = now()
      WHERE id = p_email_id AND status = 'pending'
        AND (send_after IS NULL OR send_after <= now())
      RETURNING *;
  ELSE
    RETURN QUERY
      UPDATE email_outbox
      SET status = 'sending', updated_at = now()
      WHERE id IN (
        SELECT id FROM email_outbox
        WHERE status = 'pending'
          AND (send_after IS NULL OR send_after <= now())
        ORDER BY created_at
        LIMIT 10
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
  END IF;
END;
$$;
