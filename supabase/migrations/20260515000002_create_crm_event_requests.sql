-- crm_event_requests: inbound website event requests, backfilled read-only
-- from Parse (EventRequest class). Inbound-demand signal for the
-- sales-companion / education-corpus project.
--
-- Parse has NO FK from EventRequest to a resulting Event, so matched_event_id
-- is reconstructed by the backfill script (exact email -> company+lastname ->
-- fuzzy company+date). Low-confidence matches are resolved by hand in the
-- /education review queue.

create table if not exists public.crm_event_requests (
  id                  uuid primary key default gen_random_uuid(),
  parse_object_id     text not null unique,

  first_name          text,
  last_name           text,
  email               text,
  company             text,
  phone               text,
  location            text,
  request_type        text,   -- Parse "type"
  num_people          text,   -- free-text in Parse; keep as text
  other_info          text,
  date_string         text,   -- often empty in Parse

  parse_created_at    timestamptz,
  parse_updated_at    timestamptz,

  -- Derived
  normalized_company  text,
  email_domain        text,

  -- Reconstructed link to crm_events (no FK exists in Parse)
  matched_event_id    uuid references public.crm_events(id) on delete set null,
  match_method        text,   -- exact_email | company_lastname | fuzzy_company_date | none
  match_confidence    numeric,

  raw                 jsonb,
  ingested_at         timestamptz not null default now()
);

create index if not exists crm_event_requests_email_idx
  on public.crm_event_requests (email);
create index if not exists crm_event_requests_email_domain_idx
  on public.crm_event_requests (email_domain);
create index if not exists crm_event_requests_normalized_company_idx
  on public.crm_event_requests (normalized_company);
create index if not exists crm_event_requests_matched_event_idx
  on public.crm_event_requests (matched_event_id);

alter table public.crm_event_requests enable row level security;

create policy "crm_event_requests authenticated read"
  on public.crm_event_requests for select
  to authenticated
  using (true);
