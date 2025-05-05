/*
  # Fix proposal access and authentication

  1. Changes
    - Update RLS policies to allow public access to shared proposals
    - Fix password verification function
    - Add proper session handling for passwords
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;
DROP POLICY IF EXISTS "Enable delete for owners only" ON proposals;

-- Create improved password verification function
CREATE OR REPLACE FUNCTION verify_proposal_password(proposal_id uuid, provided_password text)
RETURNS boolean AS $$
DECLARE
  stored_password text;
  is_protected boolean;
  proposal_user_id uuid;
BEGIN
  -- Get proposal details
  SELECT 
    password,
    is_password_protected,
    user_id
  INTO 
    stored_password,
    is_protected,
    proposal_user_id
  FROM proposals 
  WHERE id = proposal_id;

  -- Handle case where proposal doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Return true if:
  -- 1. User owns the proposal
  -- 2. Proposal is not password protected
  -- 3. Provided password matches stored password
  RETURN (
    proposal_user_id = auth.uid()
    OR NOT is_protected
    OR (
      stored_password IS NOT NULL 
      AND provided_password IS NOT NULL 
      AND stored_password = provided_password
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policies with improved access control
CREATE POLICY "Enable read access for all users"
ON proposals
FOR SELECT
TO public
USING (true);

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_proposal_password TO authenticated;
GRANT EXECUTE ON FUNCTION verify_proposal_password TO anon;