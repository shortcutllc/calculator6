-- Create qr_code_signs table
CREATE TABLE IF NOT EXISTS qr_code_signs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  customization JSONB NOT NULL,
  is_editable BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  unique_token TEXT UNIQUE,
  custom_url TEXT UNIQUE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qr_code_signs_user_id ON qr_code_signs(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_code_signs_status ON qr_code_signs(status);
CREATE INDEX IF NOT EXISTS idx_qr_code_signs_unique_token ON qr_code_signs(unique_token);
CREATE INDEX IF NOT EXISTS idx_qr_code_signs_custom_url ON qr_code_signs(custom_url);

-- Enable RLS
ALTER TABLE qr_code_signs ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own qr code signs" ON qr_code_signs;
DROP POLICY IF EXISTS "Users can create their own qr code signs" ON qr_code_signs;
DROP POLICY IF EXISTS "Users can update their own qr code signs" ON qr_code_signs;
DROP POLICY IF EXISTS "Users can delete their own qr code signs" ON qr_code_signs;
DROP POLICY IF EXISTS "Public access to published qr code signs" ON qr_code_signs;

-- Create RLS policies
CREATE POLICY "Users can view their own qr code signs" ON qr_code_signs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own qr code signs" ON qr_code_signs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own qr code signs" ON qr_code_signs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own qr code signs" ON qr_code_signs
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public access to published qr code signs" ON qr_code_signs
  FOR SELECT USING (status = 'published' AND unique_token IS NOT NULL);

-- Create updated_at trigger (reuse existing function if it exists)
DROP TRIGGER IF EXISTS update_qr_code_signs_updated_at ON qr_code_signs;
CREATE TRIGGER update_qr_code_signs_updated_at BEFORE UPDATE
    ON qr_code_signs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
