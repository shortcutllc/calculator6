/*
  # Fix proposal access and RLS policies

  1. Changes
    - Reset all RLS policies
    - Implement simplified access control
    - Fix public access for proposals
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable public read access for non-password protected proposals" ON proposals;
DROP POLICY IF EXISTS "Enable public read access for password protected proposals" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON proposals;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON proposals;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON proposals;

-- Temporarily disable RLS
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Create a single read policy for all proposals
CREATE POLICY "Allow all reads"
  ON proposals
  FOR SELECT
  TO public
  USING (true);

-- Create authenticated user policies
CREATE POLICY "Allow authenticated users to insert"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update own"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete own"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);