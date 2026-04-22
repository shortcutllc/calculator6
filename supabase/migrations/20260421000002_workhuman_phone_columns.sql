-- Phone enrichment for Workhuman leads
-- Source: Apollo people/match + async phone-reveal webhook.
-- 2026-04-21

alter table public.workhuman_leads
  add column if not exists phone text,
  add column if not exists mobile_phone text,
  add column if not exists work_phone text,
  add column if not exists phone_source text,
  add column if not exists phone_enriched_at timestamptz;

comment on column public.workhuman_leads.phone is
  'Best-available phone number for outreach (mobile preferred, then work, then org main line).';
comment on column public.workhuman_leads.mobile_phone is
  'Personal/cell phone from Apollo phone reveal (async, requires webhook).';
comment on column public.workhuman_leads.work_phone is
  'Direct work phone from Apollo (returned on base match when Apollo has it).';
comment on column public.workhuman_leads.phone_source is
  'Where the phone came from: apollo_mobile_reveal, apollo_work_direct, apollo_org_hq, manual.';
comment on column public.workhuman_leads.phone_enriched_at is
  'Timestamp of the last successful enrichment write (match or reveal).';
