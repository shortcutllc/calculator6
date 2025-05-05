/*
  # Add proposal access tracking and expiration

  1. New Tables
    - `access_logs`
      - Tracks proposal views and updates
      - Records access metadata (IP, user agent)
      - Links to proposals table

  2. Changes
    - Add expiration and view limit columns to proposals
    - Add function to track access attempts
    - Add indexes for performance
*/

-- Add expiration and view limit columns to proposals
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS max_views integer;

-- Create access_logs table
CREATE TABLE IF NOT EXISTS access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  accessed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  access_type text CHECK (access_type IN ('view', 'update'))
);

-- Create function to check access validity
CREATE OR REPLACE FUNCTION check_proposal_access(proposal_id uuid)
RETURNS boolean AS $$
DECLARE
  proposal_record proposals%ROWTYPE;
  view_count integer;
BEGIN
  -- Get proposal details
  SELECT * INTO proposal_record
  FROM proposals
  WHERE id = proposal_id;

  -- Check if proposal exists
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check expiration
  IF proposal_record.expires_at IS NOT NULL AND proposal_record.expires_at < now() THEN
    RETURN false;
  END IF;

  -- Check view limit
  IF proposal_record.max_views IS NOT NULL THEN
    SELECT COUNT(*) INTO view_count
    FROM access_logs
    WHERE proposal_id = proposal_record.id
    AND access_type = 'view';

    IF view_count >= proposal_record.max_views THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log access
CREATE OR REPLACE FUNCTION log_proposal_access(
  proposal_id uuid,
  access_type text,
  ip_address text DEFAULT NULL,
  user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO access_logs (
    proposal_id,
    access_type,
    ip_address,
    user_agent
  )
  VALUES (
    proposal_id,
    access_type,
    ip_address,
    user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_logs_proposal_id ON access_logs(proposal_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS idx_proposals_expires_at ON proposals(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_max_views ON proposals(max_views) WHERE max_views IS NOT NULL;

-- Update proposal policies to include access checks
CREATE POLICY "Enable access with expiration and view limits"
ON proposals
FOR SELECT
TO public
USING (
  check_proposal_access(id) AND (
    NOT is_password_protected OR
    auth.uid() = user_id OR
    verify_proposal_password(id, current_setting('app.proposal_password'::text, true))
  )
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_proposal_access TO public;
GRANT EXECUTE ON FUNCTION log_proposal_access TO public;
GRANT INSERT ON access_logs TO public;