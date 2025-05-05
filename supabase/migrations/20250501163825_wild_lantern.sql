/*
  # Fix shared proposal access policies

  1. Changes
    - Drop all existing policies
    - Create new policies for public and anonymous access
    - Add index for shared proposals
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow anonymous access to shared proposals" ON proposals;
DROP POLICY IF EXISTS "proposals_select" ON proposals;
DROP POLICY IF EXISTS "proposals_insert" ON proposals;
DROP POLICY IF EXISTS "proposals_update" ON proposals;
DROP POLICY IF EXISTS "proposals_delete" ON proposals;

-- Create new simplified policies
CREATE POLICY "proposals_select"
  ON proposals
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "proposals_insert"
  ON proposals
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "proposals_update"
  ON proposals
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "proposals_delete"
  ON proposals
  FOR DELETE
  TO public
  USING (true);

-- Add index for shared proposals
CREATE INDEX IF NOT EXISTS idx_proposals_is_shared 
ON proposals(is_shared)
WHERE is_shared = true;