-- crm_companies: the ACCOUNT/brand grain — "DraftKings", "Boston Consulting
-- Group" (one company, regardless of how many offices we serve). This is the
-- ICP / lookalike grain. Lookalike is MULTI-FACTOR: the land-and-expand
-- trajectory is a heavily-weighted signal, NOT a hard filter — every
-- descriptive dimension below feeds scoring (see memory/lookalike_strategy.md).
--
-- Rebuilt by scripts/build-crm-graph.mjs. Service-role write; authenticated read.

create table if not exists public.crm_companies (
  id                           uuid primary key default gen_random_uuid(),
  canonical_key                text not null unique,  -- normalized, deterministically safe
  display_name                 text,
  aliases                      jsonb,                 -- raw client_name variants observed (audit)
  is_internal                  boolean not null default false,  -- Shortcut's own activations/popups, not a client — excluded from ICP/expander analysis

  -- Engagement rollup (non-test events)
  total_sites                  int not null default 0,
  total_events                 int not null default 0,
  completed_events             int not null default 0,
  cancelled_events             int not null default 0,
  pending_events               int not null default 0,
  is_recurring                 boolean not null default false,
  first_event_at               timestamptz,
  last_event_at                timestamptz,
  last_completed_at            timestamptz,
  tenure_days                  int,

  -- Trajectory (a strong weighted lookalike feature, NOT a gate)
  trajectory                   text,   -- expander | multi_site_flat | single_site_deep | one_off
  site_expansion_days          int,    -- days between 1st site's and 2nd site's first event

  -- Event-type mix (from Parse category). Keeps pop-ups / weddings / retail
  -- activations separable from the core OFFICE business in ICP analysis.
  primary_event_type           text,   -- most common category (Office, Pop-Up, Wedding, ...)
  event_type_mix               jsonb,  -- { Office: n, "Pop-Up": m, ... }

  -- Descriptive dimensions for MULTI-FACTOR lookalike
  service_titles               jsonb,
  service_categories           jsonb,
  top_category                 text,
  states                       jsonb,
  cities                       jsonb,
  primary_state                text,
  primary_city                 text,
  sum_payment_completed        numeric,
  sum_mobile_revenue_completed numeric,
  contact_emails               jsonb,
  contact_domains              jsonb,
  contacts                     jsonb,

  -- External firmographic enrichment (filled later via Apollo — powers
  -- "office footprint / headroom" for Play A & Play B)
  ext_industry                 text,
  ext_employee_size            text,
  ext_num_offices              int,
  ext_hq_city                  text,
  ext_hq_state                 text,
  ext_enriched_at              timestamptz,

  built_at                     timestamptz not null default now()
);

create index if not exists crm_companies_trajectory_idx     on public.crm_companies (trajectory);
create index if not exists crm_companies_event_type_idx     on public.crm_companies (primary_event_type);
create index if not exists crm_companies_is_recurring_idx    on public.crm_companies (is_recurring);
create index if not exists crm_companies_is_internal_idx     on public.crm_companies (is_internal);
create index if not exists crm_companies_primary_state_idx   on public.crm_companies (primary_state);
create index if not exists crm_companies_top_category_idx    on public.crm_companies (top_category);
create index if not exists crm_companies_contact_domains_idx on public.crm_companies using gin (contact_domains);

alter table public.crm_companies enable row level security;

create policy "crm_companies authenticated read"
  on public.crm_companies for select to authenticated using (true);
