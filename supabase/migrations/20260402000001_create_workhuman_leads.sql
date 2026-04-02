-- Workhuman Live 2026 lead management CRM
CREATE TABLE workhuman_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  company text,
  title text,
  company_size text,
  company_size_normalized integer,
  hq_location text,
  industry text,
  multi_office boolean DEFAULT false,
  lead_score integer DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  tier text NOT NULL DEFAULT 'tier_3' CHECK (tier IN ('tier_1', 'tier_2', 'tier_3')),
  tier_override boolean DEFAULT false,
  outreach_status text NOT NULL DEFAULT 'not_contacted' CHECK (outreach_status IN ('not_contacted', 'emailed', 'responded', 'meeting_booked', 'vip_booked', 'declined', 'no_response')),
  vip_slot_day text CHECK (vip_slot_day IN ('day_1', 'day_2', 'day_3') OR vip_slot_day IS NULL),
  vip_slot_time text,
  notes text,
  email_sent_at timestamptz,
  responded_at timestamptz,
  meeting_scheduled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_workhuman_leads_score ON workhuman_leads(lead_score DESC);
CREATE INDEX idx_workhuman_leads_tier ON workhuman_leads(tier);
CREATE INDEX idx_workhuman_leads_status ON workhuman_leads(outreach_status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_workhuman_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workhuman_leads_updated_at
  BEFORE UPDATE ON workhuman_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_workhuman_leads_updated_at();

-- RLS
ALTER TABLE workhuman_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON workhuman_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow select for anon users" ON workhuman_leads
  FOR SELECT TO anon USING (true);
