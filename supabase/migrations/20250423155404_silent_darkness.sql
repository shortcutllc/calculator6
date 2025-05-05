/*
  # Update RLS policies for public access
  
  1. Changes
    - Drop all existing policies
    - Create new public access policy
    - Reinstate authenticated user policies
    - Add policy for shared proposals
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Public access to shared proposals" ON proposals;
DROP POLICY IF EXISTS "Access to password-protected proposals" ON proposals;
DROP POLICY IF EXISTS "Users can read own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can create proposals" ON proposals;
DROP POLICY IF EXISTS "Users can update own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can delete own proposals" ON proposals;
DROP POLICY IF EXISTS "Clients can update proposal status" ON proposals;
DROP POLICY IF EXISTS "Allow all reads" ON proposals;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON proposals;
DROP POLICY IF EXISTS "Allow authenticated users to update own" ON proposals;
DROP POLICY IF EXISTS "Allow authenticated users to delete own" ON proposals;

-- Temporarily disable RLS
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Create base public access policy
CREATE POLICY "Enable read access for all users"
  ON proposals
  FOR SELECT
  USING (true);

-- Create authenticated user policies
CREATE POLICY "Enable insert for authenticated users only"
  ON proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
  ON proposals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);