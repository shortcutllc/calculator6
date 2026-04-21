-- Workhuman Tier 1B — next-best batch after the top 200 VIP (Tier 1A)
-- Director+ seniority in people/HR/culture/benefits roles, bad-fit titles
-- excluded (same exclusion list as Tier 1A). Intended for Smartlead
-- multi-sender campaigns.
-- 2026-04-21

alter table public.workhuman_leads
  add column if not exists tier_1b boolean not null default false;

create index if not exists workhuman_leads_tier_1b_idx
  on public.workhuman_leads (tier_1b) where tier_1b = true;

comment on column public.workhuman_leads.tier_1b is
  'Tier 1B: next-best batch after VIP 200 (Tier 1A). Director+ seniority in people/HR/culture/benefits roles, bad-fit titles excluded. Used for Smartlead campaigns.';
