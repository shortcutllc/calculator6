-- tech_scout_ledger — the cross-day dedup + self-heal state for tech-scout,
-- moved off the Mac's prime_targets.json so tech-scout can run as a Netlify
-- background function (machine-independent). One row per company DOMAIN; `record`
-- holds the full ledger entry (the same object the JSON file kept as its value:
-- company, status, size, industry, trigger, buyer{}, queued, queue_attempts, etc).
-- trigger_type + status are denormalized into columns for the two hot queries
-- (the Monday --report join and the self-heal "landed but undrafted" scan).

create table if not exists public.tech_scout_ledger (
  domain       text primary key,
  record       jsonb not null default '{}'::jsonb,
  trigger_type text,
  status       text,
  updated_at   timestamptz not null default now()
);

create index if not exists tech_scout_ledger_status_idx on public.tech_scout_ledger (status);
create index if not exists tech_scout_ledger_trigger_type_idx on public.tech_scout_ledger (trigger_type);

comment on table public.tech_scout_ledger is
  'tech-scout dedup/self-heal ledger (replaces prime_targets.json). One row per company domain; record jsonb = full entry. See scripts/tech-scout.mjs + netlify/functions/lib/tech-scout.js.';
