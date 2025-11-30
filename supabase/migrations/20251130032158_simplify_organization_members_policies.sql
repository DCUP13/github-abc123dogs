/*
  # Simplify Organization Members RLS Policies

  1. Changes
    - Drop the recursive "Members can view other members" policy that causes errors
    - Keep the simple "Users can view their own memberships" policy
    - This allows users to see their own role and organization without recursive queries

  2. Security
    - Users can only see their own membership records
    - Owners and managers can still manage members (existing policies)
*/

DROP POLICY IF EXISTS "Members can view other members in their organization" ON organization_members;
