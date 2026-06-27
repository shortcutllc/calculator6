-- Graduation: a cold lead who replies positive moves to the PERSONAL lane.
-- channel makes the cold/personal split explicit (was inferred from campaign_id);
-- graduated_at/_reason record the move so the lead leaves cold and a human owns it.

alter table public.outreach_contacts add column if not exists channel text;          -- cold | personal
alter table public.outreach_contacts add column if not exists graduated_at timestamptz;
alter table public.outreach_contacts add column if not exists graduated_reason text;  -- e.g. positive_cold_reply
alter table public.outreach_contacts add column if not exists graduated_owner text;   -- rep email/name to handle the reply

comment on column public.outreach_contacts.channel is
  'cold = Smartlead mass; personal = rep 1:1. A positive cold reply graduates the lead to personal.';
comment on column public.outreach_contacts.graduated_at is
  'When a cold lead replied positive and moved to the personal lane (set by scripts/graduate-replies.mjs).';
