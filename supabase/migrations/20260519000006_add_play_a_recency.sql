-- Play A was "active clients only" and never showed recency, so a client we
-- last served 5 months ago looked identical to one from last week, and lapsed
-- clients had no path at all. Surface the last event date + a coarse status so
-- the page and the drafter can treat re-engagement differently from expansion.
--   play_status: 'expand'    = event within ~6mo (warm, business-as-usual)
--                're_engage' = >6mo since last event (acknowledge the gap)

alter table public.crm_play_a
  add column if not exists last_event_at      timestamptz,
  add column if not exists months_since_event int,
  add column if not exists play_status        text;
