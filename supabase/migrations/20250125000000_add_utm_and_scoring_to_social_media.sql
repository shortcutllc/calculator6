-- Add UTM tracking and lead scoring columns to social_media_contact_requests

-- Add UTM tracking columns
ALTER TABLE social_media_contact_requests
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Add lead scoring columns
ALTER TABLE social_media_contact_requests
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10, 2) DEFAULT 0.00;

-- Create indexes for new UTM columns
CREATE INDEX IF NOT EXISTS idx_social_media_contact_requests_utm_source ON social_media_contact_requests(utm_source);
CREATE INDEX IF NOT EXISTS idx_social_media_contact_requests_utm_campaign ON social_media_contact_requests(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_social_media_contact_requests_lead_score ON social_media_contact_requests(lead_score);





