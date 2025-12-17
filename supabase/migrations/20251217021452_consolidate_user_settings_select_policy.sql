/*
  # Consolidate User Settings SELECT Policy

  1. Changes
    - Drop separate SELECT policies for user_settings
    - Create a single unified policy that allows:
      - Users to view their own settings
      - Managers/owners to view member settings
    - Use the can_manage_user_resources helper function

  2. Security
    - Maintains existing permission structure
    - Users can view their own settings
    - Managers can view member settings
*/

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can read own settings" ON user_settings;
DROP POLICY IF EXISTS "Managers can view member settings" ON user_settings;

-- Create unified SELECT policy
CREATE POLICY "Users can view assigned settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR can_manage_user_resources(user_id)
  );

-- Update UPDATE policy to use helper function
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Managers can update member settings" ON user_settings;

CREATE POLICY "Managers can update member settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (can_manage_user_resources(user_id))
  WITH CHECK (can_manage_user_resources(user_id));
