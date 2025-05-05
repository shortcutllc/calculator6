/*
  # Fix proposal table RLS policies

  1. Changes
    - Add RLS policy for proposal creation
    - Update existing policies to be more permissive for authenticated users

  2. Security
    - Enable RLS on proposals table
    - Add policy for authenticated users to create proposals
    - Update policy for proposal updates
*/

-- First ensure RLS is enabled
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable delete for owners only" ON proposals;

-- Create new policies
CREATE POLICY "Enable insert for authenticated users"
ON proposals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for owners and shared proposals"
ON proposals
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  (is_editable = true AND (
    NOT is_password_protected OR 
    verify_proposal_password(id, current_setting('app.proposal_password'::text, true))
  ))
)
WITH CHECK (
  (auth.uid() = user_id) OR 
  (is_editable = true AND (
    NOT is_password_protected OR 
    verify_proposal_password(id, current_setting('app.proposal_password'::text, true))
  ))
);

CREATE POLICY "Enable read access for authenticated users"
ON proposals
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM client_proposals cp
    JOIN clients c ON cp.client_id = c.id
    WHERE cp.proposal_id = proposals.id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete for owners only"
ON proposals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);