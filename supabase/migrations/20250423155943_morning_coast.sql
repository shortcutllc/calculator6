-- Drop existing policies
DROP POLICY IF EXISTS "Allow all reads" ON proposals;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON proposals;
DROP POLICY IF EXISTS "Allow authenticated users to update own" ON proposals;
DROP POLICY IF EXISTS "Allow authenticated users to delete own" ON proposals;

-- Temporarily disable RLS
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Create policies with improved access control
CREATE POLICY "Enable read access for all users"
  ON proposals
  FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for owners and shared proposals"
  ON proposals
  FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    (is_editable = true AND NOT is_password_protected) OR
    (is_editable = true AND is_password_protected AND password IS NOT NULL)
  );

CREATE POLICY "Enable delete for owners only"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);