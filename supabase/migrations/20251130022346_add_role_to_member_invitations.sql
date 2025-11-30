/*
  # Add role to member invitations

  1. Changes
    - Add `role` column to `member_invitations` table with default value 'member'
    - Role can be: 'member', 'manager', or 'owner'
  
  2. Notes
    - This allows managers to specify what role the invited user will have
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'member_invitations' AND column_name = 'role'
  ) THEN
    ALTER TABLE member_invitations 
    ADD COLUMN role text DEFAULT 'member' CHECK (role IN ('member', 'manager', 'owner'));
  END IF;
END $$;
