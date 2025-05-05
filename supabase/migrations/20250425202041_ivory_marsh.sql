-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;
DROP POLICY IF EXISTS "Enable delete for owners only" ON proposals;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON proposals;

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

CREATE POLICY "Enable insert for authenticated users"
ON proposals
FOR INSERT
TO public
WITH CHECK (true);

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