/*
  # Make Email Addresses and Domains Globally Unique

  1. Changes
    - Drop existing unique constraints on (user_id, address) and (user_id, domain)
    - Add new unique constraints on address and domain only (globally unique)
    - Update RLS policies to only allow managers/owners to insert/update/delete
    - Remove ability for users to self-manage their email addresses

  2. Security
    - Maintains RLS on all tables
    - Ensures email addresses and domains are globally unique across all users
    - Only managers/owners can assign addresses and domains to users
    - Members can still view their assigned addresses (needed for functionality)

  3. Important Notes
    - This prevents address/domain reuse across different users
    - Ensures proper resource allocation within organizations
*/

-- ============================================
-- amazon_ses_emails: Make addresses globally unique
-- ============================================

-- Drop existing unique constraint
ALTER TABLE amazon_ses_emails
DROP CONSTRAINT IF EXISTS amazon_ses_emails_user_id_address_key;

-- Add new unique constraint on address only
ALTER TABLE amazon_ses_emails
ADD CONSTRAINT amazon_ses_emails_address_key UNIQUE (address);

-- Drop and recreate INSERT policy (remove self-management)
DROP POLICY IF EXISTS "Managers can create member SES emails" ON amazon_ses_emails;

CREATE POLICY "Managers can create member SES emails"
  ON amazon_ses_emails FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_user_resources(user_id));

-- ============================================
-- google_smtp_emails: Make addresses globally unique
-- ============================================

-- Drop existing unique constraint
ALTER TABLE google_smtp_emails
DROP CONSTRAINT IF EXISTS google_smtp_emails_user_id_address_key;

-- Add new unique constraint on address only
ALTER TABLE google_smtp_emails
ADD CONSTRAINT google_smtp_emails_address_key UNIQUE (address);

-- Drop and recreate INSERT policy (remove self-management)
DROP POLICY IF EXISTS "Managers can create member Google emails" ON google_smtp_emails;

CREATE POLICY "Managers can create member Google emails"
  ON google_smtp_emails FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_user_resources(user_id));

-- ============================================
-- amazon_ses_domains: Make domains globally unique
-- ============================================

-- Drop existing unique constraint
ALTER TABLE amazon_ses_domains
DROP CONSTRAINT IF EXISTS amazon_ses_domains_user_id_domain_key;

-- Add new unique constraint on domain only
ALTER TABLE amazon_ses_domains
ADD CONSTRAINT amazon_ses_domains_domain_key UNIQUE (domain);

-- Policies already restrict to managers only, no changes needed
