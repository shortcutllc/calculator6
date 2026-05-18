-- Link crm_events into the Company -> Site -> Event hierarchy.
-- Populated by scripts/build-crm-graph.mjs (deterministic resolution).
-- Nullable: events whose company/site are pending human review in
-- crm_alias_candidates stay unlinked until confirmed.

alter table public.crm_events
  add column if not exists company_id  uuid references public.crm_companies(id) on delete set null,
  add column if not exists site_id     uuid references public.crm_sites(id)     on delete set null,
  add column if not exists resolved_via text;  -- deterministic | review | null

create index if not exists crm_events_company_idx on public.crm_events (company_id);
create index if not exists crm_events_site_idx     on public.crm_events (site_id);
