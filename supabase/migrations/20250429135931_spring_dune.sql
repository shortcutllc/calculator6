/*
  # Streamline proposal system
  
  1. Changes
    - Remove password protection
    - Add 14-day expiration
    - Remove view tracking
    - Simplify access policies
*/

-- Remove password-related columns and functions
ALTER TABLE proposals 
  DROP COLUMN IF EXISTS is_password_protected,
  DROP COLUMN IF EXISTS password,
  DROP COLUMN IF EXISTS max_views;

DROP FUNCTION IF EXISTS verify_proposal_password(uuid, text);
DROP FUNCTION IF EXISTS public.set_config(text, text);

-- Add expiration timestamp with 14-day default
ALTER TABLE proposals
  DROP COLUMN IF EXISTS expires_at,
  ADD COLUMN expires_at timestamptz DEFAULT (now() + interval '14 days');

-- Create index for expired proposals (without function call)
CREATE INDEX IF NOT EXISTS idx_proposals_expires_at 
ON proposals(expires_at);

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for all users" ON proposals;
DROP POLICY IF EXISTS "Enable update for all users" ON proposals;
DROP POLICY IF EXISTS "Enable delete for all users" ON proposals;

-- Create simplified policies for public access
CREATE POLICY "Enable read access for all users"
ON proposals
FOR SELECT
TO public
USING (
  expires_at > now() OR expires_at IS NULL
);

CREATE POLICY "Enable insert for all users"
ON proposals
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON proposals
FOR UPDATE
TO public
USING (
  expires_at > now() OR expires_at IS NULL
);

CREATE POLICY "Enable delete for all users"
ON proposals
FOR DELETE
TO public
USING (true);

-- Drop access_logs table as it's no longer needed
DROP TABLE IF EXISTS access_logs;