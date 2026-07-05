/*
# Organization Domain Pool

## Overview
Moves domain ownership from per-user to per-organization. Domains are now registered
at the organization level first, then assigned to individual members from that pool.
This allows multiple members of the same organization to share a domain while still
preventing two different organizations from claiming the same domain.

## New Tables

### organization_domains
- `id` — UUID primary key
- `organization_id` — FK to organizations (cascade delete)
- `domain` — text, globally unique across all organizations
- `created_at` — timestamp

## Modified Tables

### amazon_ses_domains
- Drops the global unique constraint `amazon_ses_domains_domain_key`
  (which blocked multiple users from having the same domain)
- Adds a per-user unique constraint `amazon_ses_domains_user_domain_key (user_id, domain)`
  so the same user cannot have a domain twice, but different users in the same
  organization CAN share a domain

## Security
- RLS enabled on organization_domains
- SELECT: any authenticated member of the organization
- INSERT: owners and managers of the organization only
- DELETE: owners and managers of the organization only

## Important Notes
1. Existing amazon_ses_domains data is fully preserved — only the constraint changes
2. Org domains must be registered in organization_domains before they appear in the
   member domain dropdown
3. Global uniqueness has moved from amazon_ses_domains → organization_domains
4. Removing an org domain from organization_domains does NOT automatically cascade
   to amazon_ses_domains (handled at application level with a warning prompt)
*/

-- ============================================================
-- 1. Create organization_domains table
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_domains (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID       NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain         TEXT        NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT organization_domains_domain_key UNIQUE (domain)
);

ALTER TABLE organization_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_domains" ON organization_domains;
CREATE POLICY "select_org_domains" ON organization_domains FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_org_domains" ON organization_domains;
CREATE POLICY "insert_org_domains" ON organization_domains FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS "delete_org_domains" ON organization_domains;
CREATE POLICY "delete_org_domains" ON organization_domains FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ============================================================
-- 2. Relax amazon_ses_domains to per-user uniqueness
-- ============================================================

-- Drop global unique constraint (prevents domain sharing between users)
ALTER TABLE amazon_ses_domains
  DROP CONSTRAINT IF EXISTS amazon_ses_domains_domain_key;

-- Add per-user constraint (same user can't have same domain twice)
ALTER TABLE amazon_ses_domains
  DROP CONSTRAINT IF EXISTS amazon_ses_domains_user_domain_key;

ALTER TABLE amazon_ses_domains
  ADD CONSTRAINT amazon_ses_domains_user_domain_key UNIQUE (user_id, domain);
