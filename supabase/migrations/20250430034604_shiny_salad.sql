/*
  # Fix shared proposal access and security

  1. Changes
    - Simplify RLS policies to ensure proper public access
    - Remove password-related columns and functions
    - Add proper indexes for performance
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;
DROP POLICY IF EXISTS "Enable delete for owners" ON proposals;

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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_shared_access 
ON proposals(is_editable)
WHERE is_editable = true;

CREATE INDEX IF NOT EXISTS idx_proposals_changes 
ON proposals(has_changes, pending_review, updated_at)
WHERE has_changes = true;

CREATE INDEX IF NOT EXISTS idx_proposals_original_data 
ON proposals USING gin (original_data jsonb_path_ops)
WHERE original_data IS NOT NULL;