/*
  # Fix RLS policies for proposal access

  1. Changes
    - Simplify RLS policies to ensure proper public access
    - Add specific policy for password-protected proposals
    - Update existing policies to handle all cases
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON proposals;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON proposals;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON proposals;

-- Temporarily disable RLS
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Create public access policies
CREATE POLICY "Enable public read access for non-password protected proposals"
  ON proposals
  FOR SELECT
  USING (
    NOT is_password_protected OR
    auth.uid() = user_id
  );

CREATE POLICY "Enable public read access for password protected proposals"
  ON proposals
  FOR SELECT
  USING (
    is_password_protected AND
    password IS NOT NULL
  );

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