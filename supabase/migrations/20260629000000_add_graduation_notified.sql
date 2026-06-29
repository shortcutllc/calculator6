-- Graduation auto-draft + Slack ping bookkeeping.
-- When a cold lead graduates to the personal lane (channel='personal',
-- graduated_reason='positive_cold_reply'), graduation-notify-background drafts a
-- suggested 1:1 reply and pings the owner in Slack. graduation_notified_at marks
-- a lead as already handled so it never fires twice (idempotent + cron-safe).

alter table public.outreach_contacts add column if not exists graduation_notified_at timestamptz;

comment on column public.outreach_contacts.graduation_notified_at is
  'When graduation-notify-background drafted + pinged the owner for this graduated lead. NULL = pending. Set so a lead is never re-notified.';

-- Backfill: every lead graduated BEFORE this feature existed is treated as
-- already handled, so deploying the notifier does NOT retroactively blast a
-- draft + DM for the ~225 leads graduated on 2026-06-27. Only graduations that
-- happen AFTER this migration (notified_at still NULL) will fire.
update public.outreach_contacts
   set graduation_notified_at = coalesce(graduated_at, now())
 where channel = 'personal'
   and graduated_at is not null
   and graduation_notified_at is null;
