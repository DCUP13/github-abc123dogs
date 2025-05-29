/*
  # Fix dashboard statistics RLS policies

  1. Changes
    - Add INSERT, UPDATE, and DELETE policies for dashboard_statistics table
    - These policies ensure that authenticated users can:
      - Insert their own statistics
      - Update their own statistics
      - Delete their own statistics
    - Maintains security by checking user_id matches auth.uid()

  2. Security
    - Adds RLS policies for all CRUD operations
    - Ensures users can only modify their own statistics
    - Maintains existing SELECT policy
*/

-- Add INSERT policy
CREATE POLICY "Users can insert own statistics"
ON public.dashboard_statistics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy
CREATE POLICY "Users can update own statistics"
ON public.dashboard_statistics
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy
CREATE POLICY "Users can delete own statistics"
ON public.dashboard_statistics
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);