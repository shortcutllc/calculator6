-- Archetype classifier storage on crm_companies.
-- ext_signals: the Apollo org growth/tech signals (founded year, keywords,
--   technology_count, revenue, funding, public/private) banked by
--   scripts/backfill-firmographics.mjs → apollo_org_cache.json, populated here.
-- archetype / archetype_score: the two-cluster classification
--   (high_growth_tech | elite_prof_services | other) + 0-100 fit, written by
--   scripts/classify-archetypes.mjs. Keyed off ext_signals when present, else
--   industry + size fallback.
alter table public.crm_companies add column if not exists ext_signals jsonb;
alter table public.crm_companies add column if not exists archetype text;
alter table public.crm_companies add column if not exists archetype_score integer;

comment on column public.crm_companies.ext_signals is 'Apollo org growth/tech signals (founded_year, keywords, technology_count, annual_revenue, funding, is_public) — inputs to archetype-fit.';
comment on column public.crm_companies.archetype is 'Two-cluster archetype: high_growth_tech | elite_prof_services | other.';
comment on column public.crm_companies.archetype_score is '0-100 strength of fit to the assigned archetype.';
