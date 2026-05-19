-- Delivery-surface tables: generate-plays.mjs persists its ranked output here
-- so the /sales-intelligence page reads instead of re-running heavy gating in
-- the browser. Snapshot tables — the script truncates + repopulates each run.
-- Service-role write (script bypasses RLS); authenticated staff read.

create table if not exists public.crm_play_a (
  id            uuid primary key default gen_random_uuid(),
  rank          int,
  play_score    numeric,            -- Play A expansion ranking
  fit_score     numeric,
  company_id    uuid references public.crm_companies(id) on delete set null,
  company_name  text,
  employees     text,               -- ext_employee_size
  industry      text,
  sites_served  int,
  sites_list    text,
  generated_at  timestamptz not null
);
create index if not exists crm_play_a_rank_idx on public.crm_play_a (rank);
alter table public.crm_play_a enable row level security;
create policy "crm_play_a auth read" on public.crm_play_a
  for select to authenticated using (true);

create table if not exists public.crm_play_b (
  id              uuid primary key default gen_random_uuid(),
  rank            int,
  score           numeric,
  company_name    text,
  domain          text,
  employees       text,
  industry        text,
  contact_name    text,
  contact_title   text,
  title_category  text,
  generated_at    timestamptz not null
);
create index if not exists crm_play_b_rank_idx on public.crm_play_b (rank);
alter table public.crm_play_b enable row level security;
create policy "crm_play_b auth read" on public.crm_play_b
  for select to authenticated using (true);

create table if not exists public.crm_reconciliation (
  id               uuid primary key default gen_random_uuid(),
  bucket           text,            -- closed_or_client | replied_no_close | never_reached_or_no_reply
  total            int,
  title_breakdown  jsonb,           -- { NoTitle: n, OfficeMgr: n, ... }
  generated_at     timestamptz not null
);
alter table public.crm_reconciliation enable row level security;
create policy "crm_reconciliation auth read" on public.crm_reconciliation
  for select to authenticated using (true);
