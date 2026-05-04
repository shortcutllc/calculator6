-- Personal email + booth signup phone + dup linkage on workhuman_leads.
--
-- Background: when a Tier 1A/1B lead walks up to the booth and signs in
-- with a personal email, the import created a separate "walk-in" lead row
-- (source = 'whl_booth_signup'). We don't want to delete those duplicates,
-- but we want the main CRM lead to absorb the personal contact info and
-- the booth-day-of view to point at the *real* main lead so tier/assignee
-- show up correctly.
--
--   personal_email      — gmail / yahoo / etc the lead used at the booth
--   signup_phone        — cell phone they entered at the booth
--   linked_main_lead_id — for walk-in duplicates: FK back to the real main
--                         lead so the CRM can render a "↗ linked" badge.

ALTER TABLE workhuman_leads
  ADD COLUMN IF NOT EXISTS personal_email TEXT,
  ADD COLUMN IF NOT EXISTS signup_phone TEXT,
  ADD COLUMN IF NOT EXISTS linked_main_lead_id UUID REFERENCES workhuman_leads(id) ON DELETE SET NULL;

-- Index the linkage so we can quickly fetch the parent lead from a walk-in
-- row, and find all walk-ins linked to a given main lead.
CREATE INDEX IF NOT EXISTS workhuman_leads_linked_main_idx
  ON workhuman_leads(linked_main_lead_id)
  WHERE linked_main_lead_id IS NOT NULL;

COMMENT ON COLUMN workhuman_leads.personal_email IS 'Personal email (e.g. gmail) the lead used at the booth, when their main CRM email is a work address.';
COMMENT ON COLUMN workhuman_leads.signup_phone IS 'Personal cell phone the lead entered at the booth signup.';
COMMENT ON COLUMN workhuman_leads.linked_main_lead_id IS 'For walk-in duplicates created at the booth: points back to the original main CRM lead.';
