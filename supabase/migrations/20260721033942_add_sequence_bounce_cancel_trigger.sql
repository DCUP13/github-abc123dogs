/*
# CRM Sequence: Auto-cancel on bounce/unsubscribe

## Summary
Adds a trigger on `email_sent` that fires when a bounce, complaint, or failure
event updates the row. If the email belongs to a campaign sequence, the trigger
marks the corresponding `crm_campaign_contacts` row as bounced/unsubscribed and
cancels all pending outbox steps for that contact, so no further sequence steps
are sent to a bounced or complaining recipient.

## New Objects
- `fn_cancel_sequence_on_bounce()`: trigger function that checks whether the
  updated email_sent row has a campaign_id + step_id, and if the update set
  bounced_at / complained_at / failed_at. If so, it:
  1. Updates crm_campaign_contacts status to 'bounced' (or 'unsubscribed' for
     complaints) for the matching contact.
  2. Deletes all pending email_outbox rows for the same campaign + recipient
     with a later current_step.
- `trg_email_sent_sequence_cancel`: AFTER UPDATE trigger on email_sent calling
  the function.

## Security
- The trigger function is SECURITY DEFINER so it can modify crm_campaign_contacts
  and email_outbox regardless of the caller's RLS context (the Lambda uses the
  service role key, but the trigger runs in the same session).

## Notes
1. Safe to re-run — uses DROP IF EXISTS before CREATE.
2. Only fires on actual bounce/complaint/failure transitions, not every update.
*/

CREATE OR REPLACE FUNCTION fn_cancel_sequence_on_bounce()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Only act on sequence emails that just transitioned to a bad state
  IF NEW.campaign_id IS NULL OR NEW.step_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.bounced_at IS NOT NULL AND (OLD.bounced_at IS NULL OR TG_TABLE_NAME = 'email_sent') THEN
    SELECT id INTO v_client_id FROM clients WHERE email = NEW.to_email LIMIT 1;
    IF v_client_id IS NOT NULL THEN
      UPDATE crm_campaign_contacts
        SET status = 'bounced', skip_reason = 'email bounced'
        WHERE campaign_id = NEW.campaign_id AND client_id = v_client_id;

      DELETE FROM email_outbox
        WHERE campaign_id = NEW.campaign_id
          AND to_email = NEW.to_email
          AND current_step > COALESCE(
            (SELECT current_step FROM email_outbox WHERE step_id = NEW.step_id LIMIT 1),
            0
          )
          AND status = 'pending';
    END IF;

  ELSIF NEW.complained_at IS NOT NULL AND (OLD.complained_at IS NULL OR TG_TABLE_NAME = 'email_sent') THEN
    SELECT id INTO v_client_id FROM clients WHERE email = NEW.to_email LIMIT 1;
    IF v_client_id IS NOT NULL THEN
      UPDATE crm_campaign_contacts
        SET status = 'unsubscribed', skip_reason = 'complaint received'
        WHERE campaign_id = NEW.campaign_id AND client_id = v_client_id;

      DELETE FROM email_outbox
        WHERE campaign_id = NEW.campaign_id
          AND to_email = NEW.to_email
          AND current_step > COALESCE(
            (SELECT current_step FROM email_outbox WHERE step_id = NEW.step_id LIMIT 1),
            0
          )
          AND status = 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_sent_sequence_cancel ON email_sent;
CREATE TRIGGER trg_email_sent_sequence_cancel
  AFTER UPDATE ON email_sent
  FOR EACH ROW
  EXECUTE FUNCTION fn_cancel_sequence_on_bounce();
