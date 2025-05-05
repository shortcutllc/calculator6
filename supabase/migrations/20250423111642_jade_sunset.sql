/*
  # Update proposal sharing policies

  1. Changes
    - Add RLS policy for public proposal access
    - Add RLS policy for password-protected proposals
    - Update existing policies to handle shared proposals
*/

-- Add policy for public access to shared proposals
CREATE POLICY "Public access to shared proposals"
  ON proposals
  FOR SELECT
  TO public
  USING (
    NOT is_password_protected
  );

-- Add policy for password-protected proposals
CREATE POLICY "Access to password-protected proposals"
  ON proposals
  FOR SELECT
  TO public
  USING (
    is_password_protected AND 
    password IS NOT NULL
  );

-- Update existing policies to handle shared proposals
DROP POLICY IF EXISTS "Users can read own proposals" ON proposals;
CREATE POLICY "Users can read own proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    NOT is_password_protected OR
    (is_password_protected AND password IS NOT NULL)
  );