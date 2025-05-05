/*
  # Remove password protection features

  1. Changes
    - Remove password-related columns from proposals table
    - Remove unused functions and policies
*/

-- Remove password-related columns
ALTER TABLE proposals 
  DROP COLUMN IF EXISTS is_password_protected,
  DROP COLUMN IF EXISTS password;

-- Drop unused functions
DROP FUNCTION IF EXISTS verify_proposal_password(uuid, text);
DROP FUNCTION IF EXISTS public.set_config(text, text);

-- Create simplified policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for all users" ON proposals;
DROP POLICY IF EXISTS "Enable update for all users" ON proposals;
DROP POLICY IF EXISTS "Enable delete for all users" ON proposals;

CREATE POLICY "Enable read access for all users"
ON proposals
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for all users"
ON proposals
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON proposals
FOR UPDATE
TO public
USING (true);

CREATE POLICY "Enable delete for all users"
ON proposals
FOR DELETE
TO public
USING (true);