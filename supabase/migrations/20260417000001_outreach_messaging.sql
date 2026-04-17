-- Phase 1: outreach messaging integration
-- Adds Workhuman attendee ID (for jumping into DMs) and an outreach log table
-- to track which leads have been messaged through which channel.

ALTER TABLE workhuman_leads
  ADD COLUMN IF NOT EXISTS workhuman_attendee_id uuid;

CREATE INDEX IF NOT EXISTS idx_workhuman_leads_attendee_id
  ON workhuman_leads(workhuman_attendee_id) WHERE workhuman_attendee_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS lead_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES workhuman_leads(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('workhuman_dm', 'linkedin_connect', 'linkedin_dm', 'email')),
  template_id text,
  sender_name text NOT NULL,
  message_preview text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_log_lead_id ON lead_outreach_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_sent_at ON lead_outreach_log(sent_at DESC);

ALTER TABLE lead_outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users on outreach log"
  ON lead_outreach_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
