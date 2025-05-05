/*
  # Fix password verification and session configuration

  1. Changes
    - Drop and recreate set_config function with proper session handling
    - Update verify_proposal_password function to handle null passwords
    - Add proper error handling for session configuration
    - Fix policy syntax by dropping and recreating policies
*/

-- Drop existing policies first
DROP POLICY IF EXISTS "Enable read access for all users" ON proposals;
DROP POLICY IF EXISTS "Enable update for owners and shared proposals" ON proposals;

-- Drop and recreate set_config function with proper session handling
CREATE OR REPLACE FUNCTION public.set_config(
  key text,
  value text
) RETURNS void AS $$
BEGIN
  -- Use COALESCE to handle null values gracefully
  PERFORM set_config(key, COALESCE(value, ''), false);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the function
    RAISE WARNING 'Error setting config %: %', key, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate verify_proposal_password with improved null handling
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

  -- Handle case where proposal doesn't exist
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Return true if:
  -- 1. User owns the proposal
  -- 2. Proposal is not password protected
  -- 3. Provided password matches stored password (handling nulls)
  RETURN (
    proposal_user_id = auth.uid()
    OR NOT is_protected
    OR (
      stored_password IS NOT NULL 
      AND provided_password IS NOT NULL 
      AND stored_password = provided_password
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new policies
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
  auth.uid() = user_id
  OR (
    is_editable = true
    AND verify_proposal_password(id, current_setting('app.proposal_password'::text, true))
  )
);

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION public.set_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_config TO anon;
GRANT EXECUTE ON FUNCTION verify_proposal_password TO authenticated;
GRANT EXECUTE ON FUNCTION verify_proposal_password TO anon;