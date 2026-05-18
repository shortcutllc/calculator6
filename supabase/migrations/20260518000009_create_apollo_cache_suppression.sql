-- Closes the pre-flight credit/dedup gaps for the sales companion.
--
-- apollo_person_cache: every person openclaw already paid Apollo to enrich
-- (from apollo_contacts_cache.json). Powers "don't re-spend on this person"
-- and adds firmographics (headcount/industry) for Play B scoring.
--
-- crm_suppression: never-contact list. Seeded from rejected_emails.json
-- (MillionVerifier-failed). The gate ALSO reads outreach_replies live for
-- negative/unsubscribe DNC — not materialized here on purpose (no stale copy).

create table if not exists public.apollo_person_cache (
  apollo_contact_id  text primary key,
  email              text,           -- lowercased
  email_domain       text,
  name               text,
  title              text,
  company            text,
  company_headcount  text,
  location           text,
  industry           text,
  company_url        text,
  linkedin_url       text,
  email_status       text,
  start_date         text,
  cache_updated_at   timestamptz,    -- file's updated_at (snapshot age)
  ingested_at        timestamptz not null default now()
);
create index if not exists apollo_person_cache_email_idx   on public.apollo_person_cache (email);
create index if not exists apollo_person_cache_domain_idx  on public.apollo_person_cache (email_domain);
create index if not exists apollo_person_cache_industry_idx on public.apollo_person_cache (industry);
alter table public.apollo_person_cache enable row level security;
create policy "apollo_person_cache auth read" on public.apollo_person_cache
  for select to authenticated using (true);

create table if not exists public.crm_suppression (
  email        text primary key,     -- lowercased
  reason       text not null,        -- bad_email | do_not_contact | bounced
  source       text,                 -- rejected_emails.json | reply | manual
  detail       jsonb,
  ingested_at  timestamptz not null default now()
);
create index if not exists crm_suppression_reason_idx on public.crm_suppression (reason);
alter table public.crm_suppression enable row level security;
create policy "crm_suppression auth read" on public.crm_suppression
  for select to authenticated using (true);
