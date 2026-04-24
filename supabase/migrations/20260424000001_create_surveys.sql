-- Surveys: pre-event questionnaires clients send to their employees
CREATE TABLE IF NOT EXISTS surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  data JSONB NOT NULL,
  customization JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_editable BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  unique_token TEXT UNIQUE,
  custom_url TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_surveys_proposal_id ON surveys(proposal_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_unique_token ON surveys(unique_token);
CREATE INDEX IF NOT EXISTS idx_surveys_custom_url ON surveys(custom_url);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own surveys" ON surveys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own surveys" ON surveys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own surveys" ON surveys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own surveys" ON surveys
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public access to published surveys" ON surveys
  FOR SELECT USING (status = 'published' AND unique_token IS NOT NULL);

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE
    ON surveys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Survey responses: employee submissions
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  respondent_name TEXT,
  respondent_email TEXT,
  answers JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at ON survey_responses(created_at DESC);

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a response to a published survey (public form)
CREATE POLICY "Public can submit responses to published surveys" ON survey_responses
  FOR INSERT WITH CHECK (
    survey_id IN (
      SELECT id FROM surveys WHERE status = 'published'
    )
  );

-- Survey owners can read/delete responses to their own surveys
CREATE POLICY "Owners can view responses to their surveys" ON survey_responses
  FOR SELECT USING (
    survey_id IN (
      SELECT id FROM surveys WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete responses to their surveys" ON survey_responses
  FOR DELETE USING (
    survey_id IN (
      SELECT id FROM surveys WHERE user_id = auth.uid()
    )
  );
