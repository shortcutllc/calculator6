-- Mark workhuman_leads as having been on a booth waitlist during the conference.
-- Waitlist entries themselves live in workhuman_signups with team_status='waitlist'
-- (one signup row per (lead, day) so the booth view shows the per-day breakdown).
-- This boolean is a fast filter for the CRM segment view.
-- 2026-05-04

ALTER TABLE public.workhuman_leads
  ADD COLUMN IF NOT EXISTS was_waitlisted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS workhuman_leads_was_waitlisted_idx
  ON public.workhuman_leads (was_waitlisted)
  WHERE was_waitlisted = TRUE;

COMMENT ON COLUMN public.workhuman_leads.was_waitlisted IS
  'TRUE if the lead was on the booth waitlist for at least one day during Workhuman Live 2026. Per-day waitlist entries live in workhuman_signups with team_status=''waitlist''.';
