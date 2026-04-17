-- Workhuman Tier 1A (top 200 VIP) + per-teammate lead assignment
-- 2026-04-17 — Workhuman Live 2026 outreach scale-up

alter table public.workhuman_leads
  add column if not exists tier_1a boolean not null default false,
  add column if not exists assigned_to text;

create index if not exists workhuman_leads_tier_1a_idx
  on public.workhuman_leads (tier_1a) where tier_1a = true;

create index if not exists workhuman_leads_assigned_to_idx
  on public.workhuman_leads (assigned_to);

comment on column public.workhuman_leads.tier_1a is
  'Top 200 VIP subset of Tier 1 leads. Highest-touch outreach: founder emails, direct mail, manual DMs.';

comment on column public.workhuman_leads.assigned_to is
  'Sales teammate assigned to own this lead. Matches sender_name in lead_outreach_log (e.g. "Will Newton", "Caren Skutch", "Marc Levitan", "Jaimie Pritchard").';
