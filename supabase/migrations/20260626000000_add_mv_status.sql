-- Persist MillionVerifier results so verification is durable AND viewable.
-- Without this, --verify results live only in cold_engine_plan.json and every
-- run re-verifies the same leads. outreach_contacts is the source of truth for a
-- lead's deliverability; crm_play_b surfaces the badge in /sales-intelligence.

alter table public.outreach_contacts add column if not exists mv_status text;
alter table public.outreach_contacts add column if not exists mv_checked_at timestamptz;
alter table public.crm_play_b add column if not exists mv_status text;

comment on column public.outreach_contacts.mv_status is
  'MillionVerifier result: ok | catch_all | unknown | invalid | disposable. Written by cold-engine --verify.';
