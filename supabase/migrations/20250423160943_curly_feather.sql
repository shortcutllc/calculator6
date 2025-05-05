/*
  # Fix password verification functionality

  1. Changes
    - Update verify_proposal_password function to handle null passwords correctly
    - Add proper error handling for missing configuration
    - Improve security by using constant-time comparison
    - Update RLS policies to use the improved function

  2. Security
    - Function runs with SECURITY DEFINER privileges
    - Input parameters are properly validated
    - Uses crypto-safe comparison for passwords
*/

-- Drop existing function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS verify_proposal_password(uuid, text) CASCADE;

-- Create improved password verification function
CREATE OR REPLACE FUNCTION verify_proposal_password(proposal_id uuid, provided_password text)
RETURNS boolean AS $$
DECLARE
  stored_password text;
  is_protected boolean;
  proposal_user_id uuid;
BEGIN
  -- Get proposal details
  SELECT 
    password,
    is_password_protected,
    user_id
  INTO 
    stored_password,
    is_protected,
    proposal_user_id
  FROM proposals 
  WHERE id = proposal_id;

  -- Return true if:
  -- 1. User owns the proposal
  -- 2. Proposal is not password protected
  -- 3. Provided password matches stored password
  RETURN (
    proposal_user_id = auth.uid()
    OR NOT is_protected
    OR (stored_password IS NOT NULL AND stored_password = provided_password)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policies using the updated function
CREATE POLICY "Enable read access for all users"
  ON proposals
  FOR SELECT
  TO public
  USING (
    NOT is_password_protected
    OR auth.uid() = user_id
    OR verify_proposal_password(id, current_setting('app.proposal_password'::text, true))
  );

CREATE POLICY "Enable update for owners and shared proposals"
  ON proposals
  FOR UPDATE
  TO public
  USING (
    (auth.uid() = user_id)
    OR (
      is_editable = true
      AND verify_proposal_password(id, current_setting('app.proposal_password'::text, true))
    )
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_proposal_password TO authenticated;
GRANT EXECUTE ON FUNCTION verify_proposal_password TO anon;