/*
  Safe RPC for prefilling the Workhuman Recharge form from a lead_id
  in the query string. Only exposes basic fields (name, email, company)
  which the recipient would enter themselves — no sensitive info.
*/
CREATE OR REPLACE FUNCTION get_lead_prefill(lead_uuid uuid)
RETURNS TABLE(
  first_name text,
  last_name text,
  email text,
  company text
) AS $$
  SELECT
    -- Derive first/last from name column (handles "First Last" and edge cases)
    CASE
      WHEN position(' ' in name) > 0 THEN split_part(name, ' ', 1)
      ELSE name
    END AS first_name,
    CASE
      WHEN position(' ' in name) > 0 THEN trim(substring(name from position(' ' in name) + 1))
      ELSE ''
    END AS last_name,
    CASE
      WHEN email LIKE '%@no-email.placeholder' THEN ''
      ELSE email
    END AS email,
    COALESCE(company, '') AS company
  FROM workhuman_leads
  WHERE id = lead_uuid
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_lead_prefill(uuid) TO anon, authenticated;
