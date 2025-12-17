/*
  # Fix User Settings UPDATE and INSERT Policies

  1. Changes
    - Fix UPDATE policy to allow users to update their own settings
    - Fix INSERT policy to allow users to insert their own settings
    - Allow managers to also update member settings

  2. Security
    - Users can update/insert their own settings
    - Managers can update member settings
*/

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Managers can update member settings" ON user_settings;

CREATE POLICY "Users can update assigned settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR can_manage_user_resources(user_id)
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR can_manage_user_resources(user_id)
  );

-- Fix INSERT policy
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;

CREATE POLICY "Users can insert assigned settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    OR can_manage_user_resources(user_id)
  );
