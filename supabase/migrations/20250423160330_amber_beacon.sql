/*
  # Update proposal access policies

  1. Changes
    - Simplify RLS policies for better access control
    - Add specific handling for password-protected proposals
    - Improve update permissions for shared proposals
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;
DROP POLICY IF EXISTS "Enable delete for owners only" ON proposals;

-- Temporarily disable RLS
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Create new policies with improved access control
CREATE POLICY "Enable read access for all users"
  ON proposals
  FOR SELECT
  TO public
  USING (
    NOT is_password_protected OR
    auth.uid() = user_id OR
    (is_password_protected AND password IS NOT NULL)
  );

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
    (is_editable = true AND (
      NOT is_password_protected OR
      auth.uid() = user_id OR
      (is_password_protected AND password IS NOT NULL)
    ))
  );

CREATE POLICY "Enable delete for owners only"
  ON proposals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);