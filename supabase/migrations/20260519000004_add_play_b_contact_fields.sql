-- Make Play B (net-new) rows directly actionable: surface the suggested
-- contact's email / LinkedIn / location so a rep can draft + send without
-- a separate lookup. Sourced FREE from data we already have
-- (outreach_contacts + apollo_person_cache) — zero new Apollo spend.

alter table public.crm_play_b
  add column if not exists contact_email    text,
  add column if not exists contact_linkedin text,
  add column if not exists contact_location text;
