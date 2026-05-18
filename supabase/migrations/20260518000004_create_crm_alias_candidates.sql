-- crm_alias_candidates: propose-don't-destroy queue for ambiguous entity
-- resolution. Deterministic clustering never auto-merges acronyms or
-- city-suffix offices — it STAGES proposals here for Will/Jaimie/Caren to
-- confirm or reject on /education (later LLM-assisted to pre-rank).
--
-- Examples staged here:
--   acronym_alias    : "WLRK" -> "Wachtell Lipton Rosen Katz", "BCG" -> "Boston Consulting Group"
--   city_suffix_site : "DraftKings Boston" -> a Boston site of company "DraftKings"

create table if not exists public.crm_alias_candidates (
  id                  uuid primary key default gen_random_uuid(),
  candidate_type      text not null,   -- acronym_alias | city_suffix_site | fuzzy_company
  raw_name            text not null,   -- the unresolved observed name
  proposed_company_key text,           -- the company we believe it belongs to
  evidence            jsonb,           -- why (shared domain, initials match, prefix+city, similarity)
  status              text not null default 'pending', -- pending | confirmed | rejected
  decided_by          text,
  decided_at          timestamptz,
  created_at          timestamptz not null default now(),
  unique (candidate_type, raw_name)
);

create index if not exists crm_alias_candidates_status_idx on public.crm_alias_candidates (status);

alter table public.crm_alias_candidates enable row level security;

create policy "crm_alias_candidates authenticated read"
  on public.crm_alias_candidates for select to authenticated using (true);
