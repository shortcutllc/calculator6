-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for all users" ON proposals;
DROP POLICY IF EXISTS "Enable update for all users" ON proposals;
DROP POLICY IF EXISTS "Enable delete for all users" ON proposals;

-- Create simplified policies for public access
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
  (is_editable = true)
);

CREATE POLICY "Enable delete for owners"
ON proposals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);