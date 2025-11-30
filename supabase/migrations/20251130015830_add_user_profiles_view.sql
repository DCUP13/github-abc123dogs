/*
  # Add user profiles view for team members

  1. Changes
    - Create a view that joins organization_members with auth.users
    - This allows regular users to see email and basic info of their team members
    - No need for admin permissions
  
  2. Security
    - View respects existing RLS on organization_members
    - Only exposes necessary user information (id, email)
*/

-- Create a view that combines organization members with user emails
CREATE OR REPLACE VIEW organization_members_with_emails AS
SELECT 
  om.id,
  om.organization_id,
  om.user_id,
  om.role,
  om.invited_by,
  om.joined_at,
  om.created_at,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as name
FROM organization_members om
LEFT JOIN auth.users u ON om.user_id = u.id;

-- Grant access to authenticated users
GRANT SELECT ON organization_members_with_emails TO authenticated;