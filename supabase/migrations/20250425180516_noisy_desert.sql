-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;
DROP POLICY IF EXISTS "Enable delete for owners only" ON proposals;

-- Create new simplified policies
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
  auth.uid() = user_id OR
  (is_editable = true AND (
    NOT is_password_protected OR
    verify_proposal_password(id, current_setting('app.proposal_password'::text, true))
  ))
);

CREATE POLICY "Enable delete for owners only"
ON proposals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add function to verify access
CREATE OR REPLACE FUNCTION verify_proposal_access(proposal_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM proposals 
    WHERE id = proposal_id 
    AND (
      NOT is_password_protected OR
      auth.uid() = user_id OR
      verify_proposal_password(id, current_setting('app.proposal_password'::text, true))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION verify_proposal_access TO public;
GRANT EXECUTE ON FUNCTION verify_proposal_password TO public;