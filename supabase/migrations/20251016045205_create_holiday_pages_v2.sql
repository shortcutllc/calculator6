-- Create holiday_pages table
CREATE TABLE IF NOT EXISTS holiday_pages (
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
CREATE INDEX IF NOT EXISTS idx_holiday_pages_user_id ON holiday_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_holiday_pages_status ON holiday_pages(status);
CREATE INDEX IF NOT EXISTS idx_holiday_pages_unique_token ON holiday_pages(unique_token);
CREATE INDEX IF NOT EXISTS idx_holiday_pages_custom_url ON holiday_pages(custom_url);

-- Enable RLS
ALTER TABLE holiday_pages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own holiday pages" ON holiday_pages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own holiday pages" ON holiday_pages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holiday pages" ON holiday_pages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holiday pages" ON holiday_pages
  FOR DELETE USING (auth.uid() = user_id);

-- Allow public access to published holiday pages via unique token
CREATE POLICY "Public access to published holiday pages" ON holiday_pages
  FOR SELECT USING (status = 'published' AND unique_token IS NOT NULL);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_holiday_pages_updated_at BEFORE UPDATE
    ON holiday_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

