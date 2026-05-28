-- Debounce key for Phase 3 landing-page view pings on workhuman_leads.
-- Without this, a prospect rapid-refreshing the page would multi-ping the
-- rep (page_view_count increments each refresh and the threshold check
-- would keep firing). lp-view-ping.js stamps this after every successful
-- ping and skips for DEBOUNCE_HOURS afterwards.

alter table public.workhuman_leads
  add column if not exists last_lp_ping_at timestamptz;
