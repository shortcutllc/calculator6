-- Allow sharing survey results with a manager via a read-only public token
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS results_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_surveys_results_token ON surveys(results_token);

-- Public can read a survey's metadata by results_token
CREATE POLICY "Public access to surveys by results token" ON surveys
  FOR SELECT USING (results_token IS NOT NULL);

-- Public can read survey responses when the parent survey has a results token
CREATE POLICY "Public access to responses for shared-results surveys" ON survey_responses
  FOR SELECT USING (
    survey_id IN (
      SELECT id FROM surveys WHERE results_token IS NOT NULL
    )
  );
