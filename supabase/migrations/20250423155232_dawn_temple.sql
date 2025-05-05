/*
  # Update proposal sharing policies

  1. Changes
    - Add RLS policy for public proposal access
    - Add RLS policy for password-protected proposals
    - Update existing policies to handle shared proposals
*/

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Public access to shared proposals" ON proposals;
DROP POLICY IF EXISTS "Access to password-protected proposals" ON proposals;
DROP POLICY IF EXISTS "Users can read own proposals" ON proposals;

-- Add policy for public access to shared proposals
CREATE POLICY "Public access to shared proposals"
  ON proposals
  FOR SELECT
  TO public
  USING (true);

-- Add policy for password-protected proposals
CREATE POLICY "Access to password-protected proposals"
  ON proposals
  FOR SELECT
  TO public
  USING (true);

-- Update policy for authenticated users
CREATE POLICY "Users can read own proposals"
  ON proposals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    NOT is_password_protected OR
    (is_password_protected AND password IS NOT NULL)
  );