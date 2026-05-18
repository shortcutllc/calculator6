-- Test events = the company got far enough in the sales process to DEMO
-- Shortcut's tech. For companies with test events but zero real completed
-- events, that's high-intent "almost closed" loss signal — VALUED, not
-- discarded (Will, 2026-05-18). Prime loss-analysis + lookalike fuel.
-- (QA-artifact names like "Test" / "claude test" are separately flagged
-- is_internal and stay excluded from cohorts.)

alter table public.crm_companies
  add column if not exists test_events       int not null default 0,
  add column if not exists demoed_not_closed boolean not null default false;

create index if not exists crm_companies_demoed_idx
  on public.crm_companies (demoed_not_closed);
