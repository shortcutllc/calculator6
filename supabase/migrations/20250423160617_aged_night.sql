/*
  # Fix password-protected proposal access

  1. Changes
    - Add function to securely verify proposal passwords
    - Update RLS policies for password-protected proposals
    - Add session-based password verification
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;
DROP POLICY IF EXISTS "Enable delete for owners only" ON proposals;

-- Create a secure password verification function
CREATE OR REPLACE FUNCTION verify_proposal_password(proposal_id uuid, provided_password text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM proposals 
    WHERE id = proposal_id 
    AND (
      NOT is_password_protected 
      OR password = provided_password
      OR auth.uid() = user_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policies with improved access control
CREATE POLICY "Enable read access for all users"
  ON proposals
  FOR SELECT
  TO public
  USING (
    NOT is_password_protected 
    OR auth.uid() = user_id 
    OR verify_proposal_password(id, current_setting('app.proposal_password', true)::text)
  );

CREATE POLICY "Enable insert for authenticated users"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for owners and shared proposals"
  ON proposals
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR (
      is_editable = true 
      AND verify_proposal_password(id, current_setting('app.proposal_password', true)::text)
    )
  );

CREATE POLICY "Enable delete for owners only"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);