-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;
DROP POLICY IF EXISTS "Enable delete for owners only" ON proposals;
DROP POLICY IF EXISTS "Enable access with expiration and view limits" ON proposals;

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

-- Create new simplified policies
CREATE POLICY "Enable read access for all users"
ON proposals
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON proposals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for owners and shared proposals"
ON proposals
FOR UPDATE
TO public
USING (
  auth.uid() = user_id OR
  (is_editable = true AND (
    NOT is_password_protected OR
    verify_proposal_password(id, current_setting('app.proposal_password'::text, true))
  ))
);

CREATE POLICY "Enable delete for owners only"
ON proposals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_shared_access 
ON proposals(is_password_protected, is_editable)
WHERE NOT is_password_protected AND is_editable = true;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_proposal_access TO public;
GRANT EXECUTE ON FUNCTION verify_proposal_password TO public;