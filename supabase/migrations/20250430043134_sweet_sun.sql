-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;
DROP POLICY IF EXISTS "Enable delete for owners" ON proposals;

-- Remove expires_at column as it's no longer needed
ALTER TABLE proposals DROP COLUMN IF EXISTS expires_at;

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
  (is_editable = true)
);

CREATE POLICY "Enable delete for owners"
ON proposals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_proposals_shared_access 
ON proposals(is_editable)
WHERE is_editable = true;