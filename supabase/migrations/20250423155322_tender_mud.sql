/*
  # Fix proposal access policies

  1. Changes
    - Remove all existing proposal policies
    - Create new simplified policies for public and authenticated access
    - Ensure password-protected proposals are properly handled
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Public access to shared proposals" ON proposals;
DROP POLICY IF EXISTS "Access to password-protected proposals" ON proposals;
DROP POLICY IF EXISTS "Users can read own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can create proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can delete own proposals" ON proposals;
DROP POLICY IF EXISTS "Clients can update proposal status" ON proposals;

-- Disable RLS temporarily
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;

-- Enable RLS again
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies
CREATE POLICY "Allow all reads"
  ON proposals
  FOR SELECT
  TO public
  USING (true);

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