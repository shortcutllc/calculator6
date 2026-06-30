-- Store the FULL set of Smartlead campaigns a lead is in (name + date), not just
-- one id — so the Play B UI can filter to in-campaign leads and show every
-- campaign by name + date. in_campaign stays as the quick boolean filter.
alter table public.outreach_contacts add column if not exists campaign_memberships jsonb;
alter table public.crm_play_b add column if not exists campaign_memberships jsonb;

comment on column public.outreach_contacts.campaign_memberships is
  'Array of {id, name, date} for every Smartlead campaign the lead is currently in (written by sync-campaign-membership.mjs).';
