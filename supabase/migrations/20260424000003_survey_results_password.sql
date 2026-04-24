-- Password-gate the shared-results link. Replaces the plain RLS public-read
-- with a SECURITY DEFINER RPC that checks the password server-side.

ALTER TABLE surveys ADD COLUMN IF NOT EXISTS results_password TEXT;

-- Drop the public-read policies added in 20260424000002; access is now only
-- via the RPC below.
DROP POLICY IF EXISTS "Public access to surveys by results token" ON surveys;
DROP POLICY IF EXISTS "Public access to responses for shared-results surveys" ON survey_responses;

-- RPC: returns {requiresPassword, survey?, responses?}.
-- - If the token doesn't match any survey, returns null.
-- - If a password is set and the supplied one doesn't match, returns
--   {requiresPassword: true, valid: <bool>} without leaking survey data.
-- - Otherwise returns the full survey + responses.
CREATE OR REPLACE FUNCTION get_shared_survey_results(
  p_results_token TEXT,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survey surveys%ROWTYPE;
  v_responses JSONB;
BEGIN
  IF p_results_token IS NULL OR length(p_results_token) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_survey FROM surveys WHERE results_token = p_results_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_survey.results_password IS NOT NULL AND length(v_survey.results_password) > 0 THEN
    IF p_password IS NULL OR p_password <> v_survey.results_password THEN
      RETURN jsonb_build_object(
        'requiresPassword', true,
        'attempted', (p_password IS NOT NULL),
        'valid', false
      );
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at DESC), '[]'::jsonb)
    INTO v_responses
    FROM survey_responses r
    WHERE r.survey_id = v_survey.id;

  RETURN jsonb_build_object(
    'requiresPassword', false,
    'survey', to_jsonb(v_survey) - 'results_password',
    'responses', v_responses
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_shared_survey_results(TEXT, TEXT) TO anon, authenticated;
