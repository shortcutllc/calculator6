-- Create social_media_contact_requests table
CREATE TABLE IF NOT EXISTS social_media_contact_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  location TEXT,
  service_type TEXT,
  event_date DATE,
  appointment_count TEXT,
  message TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'meta')),
  campaign_id TEXT,
  ad_set_id TEXT,
  ad_id TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'followed_up', 'closed'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_media_contact_requests_platform ON social_media_contact_requests(platform);
CREATE INDEX IF NOT EXISTS idx_social_media_contact_requests_created_at ON social_media_contact_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_social_media_contact_requests_status ON social_media_contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_social_media_contact_requests_email ON social_media_contact_requests(email);
CREATE INDEX IF NOT EXISTS idx_social_media_contact_requests_campaign_id ON social_media_contact_requests(campaign_id);

-- Enable RLS
ALTER TABLE social_media_contact_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to view all social media contact requests
CREATE POLICY "Authenticated users can view social media contact requests" ON social_media_contact_requests
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow anyone to create contact requests (for form submissions)
CREATE POLICY "Anyone can create social media contact requests" ON social_media_contact_requests
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update contact requests
CREATE POLICY "Authenticated users can update social media contact requests" ON social_media_contact_requests
  FOR UPDATE USING (auth.role() = 'authenticated');
