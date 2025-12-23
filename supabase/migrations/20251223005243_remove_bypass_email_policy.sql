/*
  # Remove Bypass Email RLS Policy

  1. Changes
    - Drop "Users can read own emails" policy
      - This policy was bypassing inbox_mode filtering
      - It allowed users to see ALL emails where user_id matched, regardless of receiver address
    
  2. Impact
    - All email filtering now goes through the "Users can read emails based on inbox mode and role" policy
    - Regular mode: Users only see emails sent to their assigned addresses
    - Master mode: Managers see all organization domain emails
    
  3. Security
    - Maintains proper access control
    - Ensures inbox_mode setting is respected
*/

-- Drop the policy that bypasses inbox mode filtering
DROP POLICY IF EXISTS "Users can read own emails" ON emails;