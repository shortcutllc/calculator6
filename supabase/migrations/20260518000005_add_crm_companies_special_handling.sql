-- Curated quarantine for accounts that are real revenue but NOT ICP targets:
-- coworking operators / venues / events-industry (WeWork, Industrious, The
-- Yard, BISNOW). They pollute the lookalike cohort the same way the
-- Shortcut-internal rows did. Excluded from ICP/expander analysis, never
-- destroyed — same propose-don't-destroy philosophy as is_internal.

alter table public.crm_companies
  add column if not exists special_handling text;  -- e.g. 'venue'

create index if not exists crm_companies_special_handling_idx
  on public.crm_companies (special_handling);
