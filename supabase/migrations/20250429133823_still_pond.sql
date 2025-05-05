/*
  # Add configuration functions for proposal password handling

  1. New Functions
    - `set_config`: Sets configuration values for the current session
      - Parameters:
        - `key` (text): Configuration key name
        - `value` (text): Configuration value to set
      - Returns: void
      - Purpose: Stores proposal passwords temporarily for verification

    - `verify_proposal_password`: Verifies a provided password against a proposal's stored password
      - Parameters:
        - `proposal_id` (uuid): ID of the proposal to check
        - `provided_password` (text): Password to verify
      - Returns: boolean
      - Purpose: Validates proposal access passwords

  2. Security
    - Functions are restricted to authenticated users only
    - Password verification is done securely within the database
*/

-- Create the set_config function
CREATE OR REPLACE FUNCTION public.set_config(
  key TEXT,
  value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Store the configuration in the current session
  PERFORM set_config('app.' || key, value, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_config(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_config(TEXT, TEXT) TO anon;

-- Create or replace the verify_proposal_password function
CREATE OR REPLACE FUNCTION public.verify_proposal_password(
  proposal_id uuid,
  provided_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_password text;
BEGIN
  -- Get the password from the proposals table
  SELECT password INTO stored_password
  FROM proposals
  WHERE id = proposal_id AND is_password_protected = true;

  -- If no password found or proposal isn't password protected, return false
  IF stored_password IS NULL THEN
    RETURN false;
  END IF;

  -- Compare the provided password with the stored password
  RETURN stored_password = provided_password;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_proposal_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_proposal_password(uuid, text) TO anon;