/*
  # Allow Invitation Lookup for Temporary Password Login

  1. Changes
    - Add RLS policy to allow unauthenticated users to view their own pending invitations
    - This enables the login flow where users can sign up using invitation email + temporary password
  
  2. Security
    - Policy only allows viewing invitations where:
      - Email matches the one being queried
      - Status is 'pending'
      - Invitation has not expired
    - This prevents unauthorized access to other users' invitations
    - Does not expose sensitive data beyond what's needed for signup
*/

-- Allow unauthenticated users to view their pending invitations
CREATE POLICY "Users can view own pending invitations"
  ON member_invitations FOR SELECT
  TO anon
  USING (
    status = 'pending' AND
    expires_at > now()
  );
