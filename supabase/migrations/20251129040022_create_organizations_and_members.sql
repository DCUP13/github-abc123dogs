/*
  # Create Organizations and Team Members System

  1. New Tables
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text)
      - `owner_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `organization_members`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `user_id` (uuid, references auth.users)
      - `role` (text) - 'owner', 'manager', 'member'
      - `invited_by` (uuid, references auth.users)
      - `joined_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `member_invitations`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `email` (text)
      - `temporary_password` (text)
      - `invited_by` (uuid, references auth.users)
      - `status` (text) - 'pending', 'accepted', 'expired'
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Owners and managers can view their organization
    - Owners and managers can invite members
    - Members can view organization data
    - Members can view other members in their organization
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'member')),
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Create member_invitations table
CREATE TABLE IF NOT EXISTS member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  temporary_password text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- RLS Policies for organization_members
CREATE POLICY "Members can view other members in their organization"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and managers can add members"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners and managers can update members"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners and managers can remove members"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
    )
  );

-- RLS Policies for member_invitations
CREATE POLICY "Owners and managers can view invitations"
  ON member_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = member_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners and managers can create invitations"
  ON member_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = member_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners and managers can update invitations"
  ON member_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = member_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = member_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'manager')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_member_invitations_org ON member_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_invitations_email ON member_invitations(email);
CREATE INDEX IF NOT EXISTS idx_member_invitations_status ON member_invitations(status);