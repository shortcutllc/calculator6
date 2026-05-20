-- Per-rep pipeline: attribute every companion send to the rep who actually
-- sent it (gmail-direct / gmail-open). Without this, the follow-up queue and
-- send history are pooled across the whole team — fine for the corpus, wrong
-- once multiple reps are connected. NULL = legacy (Smartlead / pre-multi-rep
-- corpus) and is excluded from "my follow-ups" on purpose.

alter table public.outreach_sends
  add column if not exists sender_email text;

create index if not exists outreach_sends_sender_email_idx
  on public.outreach_sends (sender_email);
