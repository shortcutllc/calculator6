-- Add landing page columns to workhuman_leads for the personalized landing page feature
ALTER TABLE workhuman_leads
  ADD COLUMN IF NOT EXISTS landing_page_url text,
  ADD COLUMN IF NOT EXISTS landing_page_id uuid,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS logo_source text;

CREATE INDEX IF NOT EXISTS idx_workhuman_leads_landing_page_url ON workhuman_leads(landing_page_url) WHERE landing_page_url IS NOT NULL;
