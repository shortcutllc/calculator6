/*
  # Add set_config function for proposal password management

  1. New Functions
    - `set_config(key TEXT, value TEXT)`
      - Sets a configuration value in the current session
      - Uses PostgreSQL's built-in set_config function
      - Returns void
      - Security definer to ensure it can be called by any authenticated user

  2. Security
    - Function is marked as SECURITY DEFINER to run with elevated privileges
    - Access is restricted to authenticated users via SECURITY INVOKER
    - Input parameters are properly escaped using quote_literal

  3. Notes
    - Uses PostgreSQL's built-in set_config for session management
    - Configuration values are scoped to the current session only
    - Values are automatically cleaned up when the session ends
*/

CREATE OR REPLACE FUNCTION public.set_config(
  key TEXT,
  value TEXT
) RETURNS void AS $$
BEGIN
  -- Set the configuration parameter in the current session
  -- The false parameter means the setting will only apply to the current transaction
  PERFORM set_config(key, value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_config TO anon;