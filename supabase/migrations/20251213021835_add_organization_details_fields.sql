/*
  # Add Organization Details Fields
  
  1. Changes
    - Add `description` field for organization description
    - Add `logo_url` field for organization logo
    - Add `industry` field for industry type
    - Add `company_size` field for company size
    - Add `website` field for company website
    - Add `location` field for company location
  
  2. Security
    - Update RLS policies to allow managers to update organization details
    - Maintain existing security for other operations
*/

-- Add new columns to organizations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'description'
  ) THEN
    ALTER TABLE organizations ADD COLUMN description text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE organizations ADD COLUMN logo_url text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'industry'
  ) THEN
    ALTER TABLE organizations ADD COLUMN industry text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'company_size'
  ) THEN
    ALTER TABLE organizations ADD COLUMN company_size text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'website'
  ) THEN
    ALTER TABLE organizations ADD COLUMN website text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'location'
  ) THEN
    ALTER TABLE organizations ADD COLUMN location text DEFAULT '';
  END IF;
END $$;

-- Drop existing update policy
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;

-- Create new update policy that allows both owners and managers
CREATE POLICY "Owners and managers can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'manager')
    )
  );