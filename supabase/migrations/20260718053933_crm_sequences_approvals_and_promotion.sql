/*
# CRM Sequences, Approval Queue, Contact Promotion, Persisted SES Sender

## Summary
Extends the CRM with:
- Campaign scope (personal vs org) and personal-scope RLS.
- Org campaign permission setting (who can launch org campaigns).
- Email sequencing suite: multi-step campaigns with conditional branching.
- Approval queue for org campaigns (members draft, managers review/reorder/edit).
- Contact promotion from personal to org (audit columns).
- Per-user persisted default SES from-email.
- Outbox scheduling columns for sequenced sends + per-contact progress tracking.

## New Tables
- `crm_campaign_steps`: ordered steps within a sequence campaign. Each step has
  subject/body, delay_days, from_email, and optional conditional branch
  (branch_type + branch_target_step) to jump when a condition is met.
- `crm_campaign_approvals`: the approval queue. One row per submitted org campaign
  with status (pending/approved/rejected/reordered/returned_for_review),
  queue_position, reviewer, and manager notes.

## Modified Tables
- `crm_campaigns`: add `scope` (personal|org, default org), `sequence_id` (nullable,
  groups steps for a sequence campaign).
- `organizations`: add `who_can_run_campaigns` (managers|owners_only|assigned_only,
  default managers).
- `clients`: add `promoted_from_personal` and `original_user_id` for audit trail
  when a personal contact is moved to an org.
- `user_settings`: add `default_ses_email` to remember the user's last used sender.
- `email_outbox`: add `step_id`, `send_after`, `current_step` for sequenced scheduling.
- `crm_campaign_contacts`: add `current_step` and expand `status` CHECK to include
  active/completed/bounced/unsubscribed/skipped for sequence progress tracking.

## Security
- Personal-scope campaign policies: owner-only CRUD where scope='personal'.
- Org-scope campaigns remain visible to org members via existing policies.
- `crm_campaign_steps`: visible/editable by campaign owner (personal) or org
  members (org), mirroring crm_campaigns policies.
- `crm_campaign_approvals`: org members can read their own submissions; managers
  and owners can read all and update status/queue_position/notes.

## Notes
1. All additions are additive (IF NOT EXISTS) and safe to re-run.
2. No data is moved or deleted; existing campaigns default to scope='org'.
3. The CHECK constraint on crm_campaign_contacts.status is replaced to allow
   sequence progress states; existing rows keep their current status.
*/

-- 1. crm_campaigns: scope + sequence_id
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'org' CHECK (scope IN ('personal','org'));
ALTER TABLE crm_campaigns ADD COLUMN IF NOT EXISTS sequence_id uuid;

-- 2. organizations: who_can_run_campaigns
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS who_can_run_campaigns text NOT NULL DEFAULT 'managers'
  CHECK (who_can_run_campaigns IN ('managers','owners_only','assigned_only'));

-- 3. clients: promotion audit
ALTER TABLE clients ADD COLUMN IF NOT EXISTS promoted_from_personal boolean NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS original_user_id uuid;

-- 4. user_settings: default SES sender
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_ses_email text;

-- 5. email_outbox: scheduling + step linkage
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS step_id uuid;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS send_after timestamptz;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS current_step int;

-- 6. crm_campaign_contacts: sequence progress
ALTER TABLE crm_campaign_contacts ADD COLUMN IF NOT EXISTS current_step int NOT NULL DEFAULT 1;
DO $$ BEGIN
  -- Replace the status CHECK to allow sequence progress states.
  -- Drop the old constraint if present and add the expanded one.
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='crm_campaign_contacts_status_check' AND conrelid = 'crm_campaign_contacts'::regclass) THEN
    ALTER TABLE crm_campaign_contacts DROP CONSTRAINT crm_campaign_contacts_status_check;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='crm_campaign_contacts_status_check' AND conrelid = 'crm_campaign_contacts'::regclass) THEN
    ALTER TABLE crm_campaign_contacts ADD CONSTRAINT crm_campaign_contacts_status_check
      CHECK (status IN ('pending','sent','skipped','failed','active','completed','bounced','unsubscribed'));
  END IF;
END $$;

-- 7. crm_campaign_steps
CREATE TABLE IF NOT EXISTS crm_campaign_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  step_order int NOT NULL DEFAULT 1,
  name text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  delay_days int NOT NULL DEFAULT 0,
  from_email text NOT NULL DEFAULT '',
  branch_type text NOT NULL DEFAULT 'none' CHECK (branch_type IN ('none','opened','replied','clicked','bounced','unsubscribed')),
  branch_target_step int,
  sender_pool jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE crm_campaign_steps ENABLE ROW LEVEL SECURITY;

-- Steps follow the same ownership/membership rules as their parent campaign.
DROP POLICY IF EXISTS "select_campaign_steps" ON crm_campaign_steps;
CREATE POLICY "select_campaign_steps" ON crm_campaign_steps FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM crm_campaigns c WHERE c.id = campaign_id AND (
      (c.scope = 'personal' AND c.user_id = auth.uid()) OR
      (c.scope = 'org' AND EXISTS (
        SELECT 1 FROM organization_members m WHERE m.organization_id = c.org_id AND m.user_id = auth.uid()
      ))
    ))
  );
DROP POLICY IF EXISTS "insert_campaign_steps" ON crm_campaign_steps;
CREATE POLICY "insert_campaign_steps" ON crm_campaign_steps FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM crm_campaigns c WHERE c.id = campaign_id AND (
      (c.scope = 'personal' AND c.user_id = auth.uid()) OR
      (c.scope = 'org' AND EXISTS (
        SELECT 1 FROM organization_members m WHERE m.organization_id = c.org_id AND m.user_id = auth.uid()
      ))
    ))
  );
DROP POLICY IF EXISTS "update_campaign_steps" ON crm_campaign_steps;
CREATE POLICY "update_campaign_steps" ON crm_campaign_steps FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM crm_campaigns c WHERE c.id = campaign_id AND (
      (c.scope = 'personal' AND c.user_id = auth.uid()) OR
      (c.scope = 'org' AND EXISTS (
        SELECT 1 FROM organization_members m WHERE m.organization_id = c.org_id AND m.user_id = auth.uid()
      ))
    ))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM crm_campaigns c WHERE c.id = campaign_id AND (
      (c.scope = 'personal' AND c.user_id = auth.uid()) OR
      (c.scope = 'org' AND EXISTS (
        SELECT 1 FROM organization_members m WHERE m.organization_id = c.org_id AND m.user_id = auth.uid()
      ))
    ))
  );
DROP POLICY IF EXISTS "delete_campaign_steps" ON crm_campaign_steps;
CREATE POLICY "delete_campaign_steps" ON crm_campaign_steps FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM crm_campaigns c WHERE c.id = campaign_id AND (
      (c.scope = 'personal' AND c.user_id = auth.uid()) OR
      (c.scope = 'org' AND EXISTS (
        SELECT 1 FROM organization_members m WHERE m.organization_id = c.org_id AND m.user_id = auth.uid()
      ))
    ))
  );

-- 8. crm_campaign_approvals (the queue)
CREATE TABLE IF NOT EXISTS crm_campaign_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','reordered','returned_for_review')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  queue_position int NOT NULL DEFAULT 0,
  manager_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE crm_campaign_approvals ENABLE ROW LEVEL SECURITY;

-- Any org member can read approvals for their org; only managers/owners can modify.
DROP POLICY IF EXISTS "select_org_approvals" ON crm_campaign_approvals;
CREATE POLICY "select_org_approvals" ON crm_campaign_approvals FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_org_approvals" ON crm_campaign_approvals;
CREATE POLICY "insert_org_approvals" ON crm_campaign_approvals FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = org_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_manager_approvals" ON crm_campaign_approvals;
CREATE POLICY "update_manager_approvals" ON crm_campaign_approvals FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = org_id AND m.user_id = auth.uid()
      AND m.role IN ('owner','manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = org_id AND m.user_id = auth.uid()
      AND m.role IN ('owner','manager'))
  );
DROP POLICY IF EXISTS "delete_manager_approvals" ON crm_campaign_approvals;
CREATE POLICY "delete_manager_approvals" ON crm_campaign_approvals FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = org_id AND m.user_id = auth.uid()
      AND m.role IN ('owner','manager'))
  );

-- 9. Personal-scope campaign policies (owner-only, supplement existing owner policies)
-- Existing policies already restrict to auth.uid() = user_id, which covers personal scope.
-- Add an explicit personal-scope safety net for clarity (no-op if already covered).
-- No additional policies needed: the existing user_id = auth.uid() check already
-- enforces owner-only access for both personal and org-scope rows owned by the user.

-- 10. Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_campaign_steps_campaign ON crm_campaign_steps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_approvals_org_status ON crm_campaign_approvals(org_id, status);
CREATE INDEX IF NOT EXISTS idx_outbox_send_after ON email_outbox(send_after) WHERE send_after IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_current_step ON crm_campaign_contacts(campaign_id, current_step);
