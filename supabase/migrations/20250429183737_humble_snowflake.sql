-- First drop the dependent policies
DROP POLICY IF EXISTS "Clients can view assigned proposals" ON proposals;
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;
DROP POLICY IF EXISTS "Enable delete for owners" ON proposals;

-- Now we can safely drop the client-related tables
DROP TABLE IF EXISTS client_proposals;
DROP TABLE IF EXISTS clients;

-- Remove password and client-related columns
ALTER TABLE proposals 
  DROP COLUMN IF EXISTS is_password_protected,
  DROP COLUMN IF EXISTS password,
  DROP COLUMN IF EXISTS max_views;

-- Drop unused functions
DROP FUNCTION IF EXISTS verify_proposal_password(uuid, text);
DROP FUNCTION IF EXISTS public.set_config(text, text);

-- Create simplified policies
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

-- Add index for shared proposals
CREATE INDEX IF NOT EXISTS idx_proposals_shared_access 
ON proposals(is_editable)
WHERE is_editable = true;

-- Add index for change tracking
CREATE INDEX IF NOT EXISTS idx_proposals_changes 
ON proposals(has_changes, pending_review, updated_at)
WHERE has_changes = true;

-- Add index for original data comparison
CREATE INDEX IF NOT EXISTS idx_proposals_original_data 
ON proposals USING gin (original_data jsonb_path_ops)
WHERE original_data IS NOT NULL;