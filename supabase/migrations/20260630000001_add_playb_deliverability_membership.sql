-- Play B UI: surface deliverability (BounceBan) + Smartlead campaign membership.
-- crm_play_b already carries mv_status; add bounceban_status so the UI can show a
-- catch-all BounceBan recovered as "verified", and in_campaign so it can mark/hide
-- leads already in a Smartlead campaign.
alter table public.crm_play_b add column if not exists bounceban_status text;
alter table public.crm_play_b add column if not exists in_campaign boolean default false;
alter table public.crm_play_b add column if not exists smartlead_campaign_id text;

-- Campaign membership lives on outreach_contacts (written by sync-campaign-membership.mjs,
-- surfaced into crm_play_b by generate-plays).
alter table public.outreach_contacts add column if not exists in_campaign boolean default false;
alter table public.outreach_contacts add column if not exists smartlead_campaign_id text;

create index if not exists idx_outreach_contacts_in_campaign on public.outreach_contacts (in_campaign) where in_campaign = true;
