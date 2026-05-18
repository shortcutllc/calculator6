-- crm_sites: the OFFICE/LOCATION grain — "DraftKings — Las Vegas, NV" vs
-- "DraftKings — Boston, MA". One company, many sites. This is the
-- land-and-expand grain: site-level contacts are the local decision-makers,
-- and "Shortcut serves 1 of N offices" is the Play A expansion signal.

create table if not exists public.crm_sites (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.crm_companies(id) on delete cascade,
  site_key           text not null unique,  -- companyKey | state | city
  site_label         text,                  -- "DraftKings — Las Vegas, NV"
  city               text,
  state              text,

  total_events       int not null default 0,
  completed_events   int not null default 0,
  cancelled_events   int not null default 0,
  first_event_at     timestamptz,
  last_event_at      timestamptz,
  last_completed_at  timestamptz,

  -- Site-local contacts (the people to reach for THIS office's expansion)
  contact_emails     jsonb,
  contact_domains    jsonb,
  contacts           jsonb,

  built_at           timestamptz not null default now()
);

create index if not exists crm_sites_company_idx on public.crm_sites (company_id);
create index if not exists crm_sites_state_idx    on public.crm_sites (state);

alter table public.crm_sites enable row level security;

create policy "crm_sites authenticated read"
  on public.crm_sites for select to authenticated using (true);
