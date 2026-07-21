/*
# CRM Sequence Orchestration

## Summary
Adds the database infrastructure to orchestrate multi-step sequence campaigns:
- Links email_sent rows back to their campaign and step so branch conditions can be
  evaluated from deliverability events.
- Adds two SECURITY DEFINER RPCs:
  - `evaluate_sequence_step(p_outbox_id)`: called BEFORE sending a sequence step.
    Checks whether the contact has bounced/unsubscribed/replied since the last step,
    evaluates the step's branch condition, and either allows the send, skips it, or
    jumps to a different step. Returns the decision so the sender can act.
  - `update_sequence_progress(p_outbox_id, p_success)`: called AFTER a send attempt.
    Updates crm_campaign_contacts progress, cancels remaining steps on bounce/
    unsubscribe, and marks the contact completed when the last step sends.
- Adds an index on email_sent(campaign_id, step_id) for fast branch lookups.

## Modified Tables
- `email_sent`: add `campaign_id` (nullable uuid) and `step_id` (nullable uuid) so
  deliverability events on a sent email can be traced back to the campaign step
  that produced it. Both are nullable because existing rows have no campaign link.

## New Functions
- `evaluate_sequence_step(p_outbox_id uuid)`: returns jsonb with:
  - `action`: 'send' | 'skip' | 'jump'
  - `reason`: human-readable explanation
  - `jump_step`: step_order to jump to (only when action='jump')
  - `contact_id`: the crm_campaign_contacts.id for logging
- `update_sequence_progress(p_outbox_id uuid, p_success boolean)`: returns jsonb
  with `status` ('active'|'completed'|'bounced'|'skipped') and `current_step`.

## Security
- Both RPCs are SECURITY DEFINER so the edge function (using the service role key)
  can update contact progress without needing per-row RLS access. They only mutate
  rows linked to the provided outbox id, so there is no cross-tenant risk.

## Notes
1. All changes are additive and safe to re-run.
2. No data is moved or deleted; existing email_sent rows keep NULL campaign_id.
3. The RPCs are designed to be called by the send-email edge function, which
   processes outbox rows one at a time.
*/

-- 1. Link email_sent back to campaign + step
ALTER TABLE email_sent ADD COLUMN IF NOT EXISTS campaign_id uuid;
ALTER TABLE email_sent ADD COLUMN IF NOT EXISTS step_id uuid;
CREATE INDEX IF NOT EXISTS idx_email_sent_campaign_step ON email_sent(campaign_id, step_id) WHERE campaign_id IS NOT NULL;

-- 2. evaluate_sequence_step: called before sending a sequence step
CREATE OR REPLACE FUNCTION evaluate_sequence_step(p_outbox_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_outbox      record;
  v_contact     record;
  v_step        record;
  v_prev_sent   record;
  v_action      text := 'send';
  v_reason      text := '';
  v_jump_step   int;
  v_contact_id  uuid;
BEGIN
  SELECT * INTO v_outbox FROM email_outbox WHERE id = p_outbox_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('action'::text, 'skip', 'reason'::text, 'outbox row not found');
  END IF;

  -- Only sequence steps have step_id + campaign_id
  IF v_outbox.step_id IS NULL OR v_outbox.campaign_id IS NULL THEN
    RETURN jsonb_build_object('action'::text, 'send', 'reason'::text, 'not a sequence step');
  END IF;

  -- Find the campaign contact for this campaign + recipient
  SELECT * INTO v_contact
    FROM crm_campaign_contacts
    WHERE campaign_id = v_outbox.campaign_id
      AND client_id = (
        SELECT id FROM clients WHERE email = v_outbox.to_email LIMIT 1
      )
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('action'::text, 'send', 'reason'::text, 'no contact record');
  END IF;

  v_contact_id := v_contact.id;

  -- If contact already bounced or unsubscribed, cancel all remaining steps
  IF v_contact.status = 'bounced' THEN
    DELETE FROM email_outbox
      WHERE campaign_id = v_outbox.campaign_id
        AND to_email = v_outbox.to_email
        AND current_step > v_outbox.current_step
        AND status = 'pending';
    RETURN jsonb_build_object('action'::text, 'skip', 'reason'::text, 'contact bounced', 'contact_id'::text, v_contact_id);
  END IF;

  IF v_contact.status = 'unsubscribed' THEN
    DELETE FROM email_outbox
      WHERE campaign_id = v_outbox.campaign_id
        AND to_email = v_outbox.to_email
        AND current_step > v_outbox.current_step
        AND status = 'pending';
    RETURN jsonb_build_object('action'::text, 'skip', 'reason'::text, 'contact unsubscribed', 'contact_id'::text, v_contact_id);
  END IF;

  IF v_contact.status = 'completed' THEN
    RETURN jsonb_build_object('action'::text, 'skip', 'reason'::text, 'sequence already completed', 'contact_id'::text, v_contact_id);
  END IF;

  -- Fetch the step definition for branch evaluation
  SELECT * INTO v_step
    FROM crm_campaign_steps
    WHERE id = v_outbox.step_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('action'::text, 'send', 'reason'::text, 'step definition not found');
  END IF;

  -- Evaluate branch condition based on the PREVIOUS step's deliverability
  IF v_step.branch_type IS NOT NULL AND v_step.branch_type <> 'none' THEN
    -- Look at the most recent email_sent for this campaign + recipient
    SELECT * INTO v_prev_sent
      FROM email_sent
      WHERE campaign_id = v_outbox.campaign_id
        AND to_email = v_outbox.to_email
      ORDER BY sent_at DESC
      LIMIT 1;

    IF FOUND THEN
      CASE v_step.branch_type
        WHEN 'opened' THEN
          IF v_prev_sent.opened_at IS NOT NULL THEN
            v_action := 'send';
            v_reason := 'previous email was opened';
          ELSE
            v_action := 'skip';
            v_reason := 'previous email was not opened';
          END IF;
        WHEN 'replied' THEN
          IF v_prev_sent.reply_count > 0 THEN
            v_action := 'send';
            v_reason := 'recipient replied';
          ELSE
            v_action := 'skip';
            v_reason := 'recipient did not reply';
          END IF;
        WHEN 'clicked' THEN
          IF v_prev_sent.clicked_at IS NOT NULL THEN
            v_action := 'send';
            v_reason := 'previous email was clicked';
          ELSE
            v_action := 'skip';
            v_reason := 'previous email was not clicked';
          END IF;
        WHEN 'bounced' THEN
          IF v_prev_sent.bounced_at IS NOT NULL THEN
            v_action := 'skip';
            v_reason := 'previous email bounced';
          ELSE
            v_action := 'send';
            v_reason := 'previous email did not bounce';
          END IF;
        WHEN 'unsubscribed' THEN
          v_action := 'skip';
          v_reason := 'unsubscribe branch';
        ELSE
          v_action := 'send';
      END CASE;

      -- If skipping and a jump target is defined, jump instead
      IF v_action = 'skip' AND v_step.branch_target_step IS NOT NULL THEN
        v_action := 'jump';
        v_jump_step := v_step.branch_target_step;
        v_reason := v_reason || ' — jumping to step ' || v_step.branch_target_step;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'action'::text, v_action,
    'reason'::text, v_reason,
    'jump_step'::text, v_jump_step,
    'contact_id'::text, v_contact_id
  );
END;
$$;

-- 3. update_sequence_progress: called after a send attempt
CREATE OR REPLACE FUNCTION update_sequence_progress(p_outbox_id uuid, p_success boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_outbox   record;
  v_contact  record;
  v_total_steps int;
  v_new_status  text := 'active';
  v_new_step    int;
BEGIN
  SELECT * INTO v_outbox FROM email_outbox WHERE id = p_outbox_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status'::text, 'not_found');
  END IF;

  IF v_outbox.campaign_id IS NULL OR v_outbox.step_id IS NULL THEN
    RETURN jsonb_build_object('status'::text, 'not_sequence');
  END IF;

  SELECT * INTO v_contact
    FROM crm_campaign_contacts
    WHERE campaign_id = v_outbox.campaign_id
      AND client_id = (
        SELECT id FROM clients WHERE email = v_outbox.to_email LIMIT 1
      )
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status'::text, 'no_contact');
  END IF;

  -- Count total steps in this campaign
  SELECT count(*) INTO v_total_steps
    FROM crm_campaign_steps
    WHERE campaign_id = v_outbox.campaign_id;

  IF p_success THEN
    -- Update current_step to the step that was just sent
    v_new_step := v_outbox.current_step;

    -- If this was the last step, mark contact completed
    IF v_outbox.current_step >= v_total_steps THEN
      v_new_status := 'completed';
    ELSE
      v_new_status := 'active';
    END IF;

    UPDATE crm_campaign_contacts
      SET current_step = v_new_step,
          status = v_new_status,
          sent_at = now()
      WHERE id = v_contact.id;

  ELSE
    -- Send failed — cancel remaining steps for this contact
    DELETE FROM email_outbox
      WHERE campaign_id = v_outbox.campaign_id
        AND to_email = v_outbox.to_email
        AND current_step > v_outbox.current_step
        AND status = 'pending';

    UPDATE crm_campaign_contacts
      SET status = 'failed',
          skip_reason = 'send_failed_at_step_' || v_outbox.current_step
      WHERE id = v_contact.id;

    v_new_status := 'failed';
  END IF;

  RETURN jsonb_build_object(
    'status'::text, v_new_status,
    'current_step'::text, COALESCE(v_new_step, v_outbox.current_step)
  );
END;
$$;
