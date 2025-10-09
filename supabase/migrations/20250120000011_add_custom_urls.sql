-- Add custom URL fields to existing tables
ALTER TABLE proposals ADD COLUMN custom_url_slug TEXT;
ALTER TABLE headshot_events ADD COLUMN custom_url_slug TEXT;
ALTER TABLE employee_galleries ADD COLUMN custom_url_slug TEXT;
ALTER TABLE photographer_tokens ADD COLUMN custom_url_slug TEXT;

-- Create custom URLs mapping table for better organization
CREATE TABLE custom_urls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('proposal', 'headshot_event', 'employee_gallery', 'photographer_token')),
  custom_slug TEXT NOT NULL,
  client_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_name, custom_slug, type)
);

-- Create indexes for fast lookups
CREATE INDEX idx_custom_urls_client_slug ON custom_urls(client_name, custom_slug);
CREATE INDEX idx_custom_urls_original_id ON custom_urls(original_id, type);

-- Enable RLS
ALTER TABLE custom_urls ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_urls
CREATE POLICY "custom_urls_public_read" ON custom_urls
  FOR SELECT USING (true);

CREATE POLICY "custom_urls_admin_write" ON custom_urls
  FOR ALL USING (auth.role() = 'authenticated');

-- Function to generate URL-friendly slugs
CREATE OR REPLACE FUNCTION generate_url_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to ensure unique custom URLs
CREATE OR REPLACE FUNCTION ensure_unique_custom_url(
  p_client_name TEXT,
  p_custom_slug TEXT,
  p_type TEXT,
  p_original_id UUID
)
RETURNS TEXT AS $$
DECLARE
  final_slug TEXT := p_custom_slug;
  counter INTEGER := 1;
BEGIN
  -- Check if the slug already exists for this client and type
  WHILE EXISTS (
    SELECT 1 FROM custom_urls 
    WHERE client_name = p_client_name 
      AND custom_slug = final_slug 
      AND type = p_type 
      AND original_id != p_original_id
  ) LOOP
    final_slug := p_custom_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

