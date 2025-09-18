-- Add Headshot Gallery System Tables
-- Migration: 20250917193921_add_headshot_gallery_tables.sql

-- Create headshot_events table
CREATE TABLE IF NOT EXISTS headshot_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  total_employees INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create employee_galleries table
CREATE TABLE IF NOT EXISTS employee_galleries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES headshot_events(id) ON DELETE CASCADE,
  employee_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  unique_token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'photos_uploaded', 'selection_made', 'retouching', 'completed', 'expired')),
  selected_photo_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gallery_photos table
CREATE TABLE IF NOT EXISTS gallery_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL REFERENCES employee_galleries(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_name VARCHAR(255),
  is_selected BOOLEAN DEFAULT FALSE,
  is_final BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS headshot_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL REFERENCES employee_galleries(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('gallery_ready', 'selection_confirmed', 'final_ready')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
  email_address VARCHAR(255),
  message_content TEXT
);

-- Add foreign key constraint for selected_photo_id
ALTER TABLE employee_galleries 
ADD CONSTRAINT fk_selected_photo 
FOREIGN KEY (selected_photo_id) REFERENCES gallery_photos(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_headshot_events_status ON headshot_events(status);
CREATE INDEX IF NOT EXISTS idx_headshot_events_date ON headshot_events(event_date);
CREATE INDEX IF NOT EXISTS idx_employee_galleries_event_id ON employee_galleries(event_id);
CREATE INDEX IF NOT EXISTS idx_employee_galleries_token ON employee_galleries(unique_token);
CREATE INDEX IF NOT EXISTS idx_employee_galleries_status ON employee_galleries(status);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery_id ON gallery_photos(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_selected ON gallery_photos(is_selected);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_final ON gallery_photos(is_final);
CREATE INDEX IF NOT EXISTS idx_headshot_notifications_gallery_id ON headshot_notifications(gallery_id);
CREATE INDEX IF NOT EXISTS idx_headshot_notifications_type ON headshot_notifications(type);

-- Create function to generate unique tokens
CREATE OR REPLACE FUNCTION generate_gallery_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_headshot_events_updated_at
  BEFORE UPDATE ON headshot_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_galleries_updated_at
  BEFORE UPDATE ON employee_galleries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for security
ALTER TABLE headshot_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE headshot_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for headshot_events (admin only)
CREATE POLICY "headshot_events_admin_only" ON headshot_events
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy for employee_galleries (admin + token access)
CREATE POLICY "employee_galleries_admin_access" ON employee_galleries
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy for gallery_photos (admin + token access)
CREATE POLICY "gallery_photos_admin_access" ON gallery_photos
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy for headshot_notifications (admin only)
CREATE POLICY "headshot_notifications_admin_only" ON headshot_notifications
  FOR ALL USING (auth.role() = 'authenticated');

-- Create storage bucket for headshot photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('headshot-photos', 'headshot-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for headshot photos
CREATE POLICY "headshot_photos_admin_access" ON storage.objects
  FOR ALL USING (bucket_id = 'headshot-photos' AND auth.role() = 'authenticated');

-- Create storage policy for public access to specific photos (for employee galleries)
DROP POLICY IF EXISTS "headshot_photos_public_access" ON storage.objects;
CREATE POLICY "headshot_photos_public_access" ON storage.objects
  FOR SELECT USING (bucket_id = 'headshot-photos');
