/*
  # Add logo support to proposals

  1. Changes
    - Add index for customization column to improve query performance
    - Update existing RLS policies
*/

-- Add index for customization column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_proposals_customization 
ON proposals USING gin (customization jsonb_path_ops);

-- Drop existing policies
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