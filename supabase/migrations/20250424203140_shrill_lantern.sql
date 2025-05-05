/*
  # Fix shared proposal access policies

  1. Changes
    - Update RLS policies to allow public access to shared proposals
    - Add proper authentication handling for shared views
    - Fix password verification for public access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;
DROP POLICY IF EXISTS "Enable delete for owners only" ON proposals;

-- Create new policies with improved access control
CREATE POLICY "Enable read access for all users"
ON proposals
FOR SELECT
TO public
USING (
  (NOT is_password_protected AND current_setting('request.path', true) LIKE '%shared=true%')
  OR auth.uid() = user_id
  OR verify_proposal_password(id, current_setting('app.proposal_password'::text, true))
);

CREATE POLICY "Enable insert for authenticated users"
ON proposals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for owners and shared proposals"
ON proposals
FOR UPDATE
TO public
USING (
  auth.uid() = user_id
  OR (
    is_editable = true
    AND current_setting('request.path', true) LIKE '%shared=true%'
    AND (
      NOT is_password_protected
      OR verify_proposal_password(id, current_setting('app.proposal_password'::text, true))
    )
  )
);

CREATE POLICY "Enable delete for owners only"
ON proposals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_shared_access 
ON proposals(is_password_protected, is_editable)
WHERE NOT is_password_protected AND is_editable = true;