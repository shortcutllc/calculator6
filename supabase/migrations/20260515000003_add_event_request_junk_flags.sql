-- Read-only data-quality flags on crm_event_requests so the inbound/ICP
-- analysis can exclude noise and the /education page can show a triage queue.
-- Heuristic only — NEVER auto-deletes; Will/Jaimie/Caren confirm or override.
-- Dry-run measured ~39% of EventRequest as individuals / home-service / bot
-- spam submitted on a B2B form (free-email+no-company, dup-phone/email
-- clusters, URLs in text).

alter table public.crm_event_requests
  add column if not exists is_likely_junk boolean,
  add column if not exists quality_flags  jsonb;  -- per-signal breakdown for /education ("flagged because…")

create index if not exists crm_event_requests_is_likely_junk_idx
  on public.crm_event_requests (is_likely_junk);
