-- Surface "who last touched this prospect" on every Play B row so the original
-- rep re-engages (preserves continuity, avoids stepping on each other's
-- threads). Derived in generate-plays from outreach_sends.sender_email
-- (companion sends) or from the campaign name (legacy Smartlead corpus,
-- which encodes the rep, e.g. "June 13, San Francisco - Will").

alter table public.crm_play_b
  add column if not exists last_sender_name  text,
  add column if not exists last_sender_email text;

create index if not exists crm_play_b_last_sender_name_idx
  on public.crm_play_b (last_sender_name);
