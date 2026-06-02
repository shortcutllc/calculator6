-- Broker GTM Sprint 1 — target firms + per-contact broker tracking
--
-- Two parallel tracks per broker_outreach_playbook.md:
--   track='broker'      — top 30 NYC tri-state benefits brokers, Tier 1/2/3
--   track='carrier_hec' — Cigna / Aetna / Anthem Health Engagement Consultants
--
-- Reps in scope: Will + Caren only (Jaimie + Marc continue their current work).
-- Sprint 1 caps Apollo discovery at 150 enrichments split across both tracks.

-- ---- crm_target_firms ----
CREATE TABLE IF NOT EXISTS public.crm_target_firms (
  id              text PRIMARY KEY,                  -- slug, e.g. 'onedigital', 'cigna'
  display_name    text NOT NULL,
  tier            text NOT NULL CHECK (tier IN ('tier_1','tier_2','tier_3','carrier')),
  track           text NOT NULL CHECK (track IN ('broker','carrier_hec')),
  domain          text,                              -- primary email domain
  nyc_presence    text,
  why             text,                              -- why we picked them
  priority_rank   int,                               -- 1 = highest priority
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_target_firms_track_rank
  ON public.crm_target_firms(track, priority_rank);

ALTER TABLE public.crm_target_firms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "target_firms read all authenticated"
  ON public.crm_target_firms FOR SELECT TO authenticated USING (true);

-- ---- outreach_contacts broker columns ----
ALTER TABLE public.outreach_contacts
  ADD COLUMN IF NOT EXISTS broker_track          text,
  ADD COLUMN IF NOT EXISTS broker_assigned_to    text,
  ADD COLUMN IF NOT EXISTS broker_firm_id        text REFERENCES public.crm_target_firms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS broker_priority_rank  int,
  ADD COLUMN IF NOT EXISTS broker_added_at       timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outreach_contacts_broker_track_check'
  ) THEN
    ALTER TABLE public.outreach_contacts
      ADD CONSTRAINT outreach_contacts_broker_track_check
      CHECK (broker_track IS NULL OR broker_track IN ('broker','carrier_hec'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_outreach_contacts_broker_track_assigned
  ON public.outreach_contacts(broker_track, broker_assigned_to)
  WHERE broker_track IS NOT NULL;

COMMENT ON COLUMN public.outreach_contacts.broker_track IS 'GTM track: broker (mid-market brokers) or carrier_hec (Cigna/Aetna/Anthem HECs). NULL = not part of the broker GTM plan.';
COMMENT ON COLUMN public.outreach_contacts.broker_assigned_to IS 'Rep gmail email this contact is assigned to (will@getshortcut.co or caren@getshortcut.co for the Sprint 1 cohort).';
