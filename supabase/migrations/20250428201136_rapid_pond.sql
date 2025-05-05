/*
  # Fix shared proposal access

  1. Changes
    - Simplify RLS policies to ensure proper public access
    - Fix password verification function
    - Add proper error handling
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for all users" ON proposals;
DROP POLICY IF EXISTS "Enable update for all users" ON proposals;
DROP POLICY IF EXISTS "Enable delete for all users" ON proposals;

-- Temporarily disable RLS
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies
CREATE POLICY "Enable read access for all users"
ON proposals
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for all users"
ON proposals
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON proposals
FOR UPDATE
TO public
USING (true);

CREATE POLICY "Enable delete for all users"
ON proposals
FOR DELETE
TO public
USING (true);

-- Improve password verification function
CREATE OR REPLACE FUNCTION verify_proposal_password(proposal_id uuid, provided_password text)
RETURNS boolean AS $$
DECLARE
  stored_password text;
  is_protected boolean;
BEGIN
  -- Get proposal details
  SELECT 
    password,
    is_password_protected
  INTO 
    stored_password,
    is_protected
  FROM proposals 
  WHERE id = proposal_id;

  -- Handle case where proposal doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Return true if:
  -- 1. Proposal is not password protected
  -- 2. Provided password matches stored password
  RETURN (
    NOT is_protected
    OR (
      stored_password IS NOT NULL 
      AND provided_password IS NOT NULL 
      AND stored_password = provided_password
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_proposal_password TO public;