-- Per-rep Slack notification settings (used by slack-rep-digest scheduled function
-- and the event-driven ping hooks). Personal — every notification is a DM to
-- exactly one rep, never a channel post. Mute/snooze state is per-rep too.
--
-- Columns:
--   slack_user_id         — Slack member ID (e.g. U06ABC...) the rep was looked
--                           up to via users.lookupByEmail. Persisted so we don't
--                           re-lookup every digest run.
--   tz                    — IANA timezone for "when is 8am for this rep". Default
--                           America/New_York; rep can change via Settings later.
--   digest_enabled        — master switch for the daily digest.
--   digest_skip_weekends  — skip Sat/Sun.
--   digest_last_sent_at   — dedupe key so the hourly cron doesn't double-send.
--   event_pings_enabled   — master switch for event-driven pings (reply,
--                           landing page view, booth signup, cross-rep email,
--                           invoice paid).
--   muted_lead_emails     — array of emails the rep has muted permanently;
--                           no pings about these leads.
--   muted_until           — global snooze; suppresses ALL auto-pings (digest
--                           + event-driven) until this timestamp. NULL = not snoozed.

alter table public.gmail_accounts
  add column if not exists slack_user_id text,
  add column if not exists tz text default 'America/New_York',
  add column if not exists digest_enabled boolean default true,
  add column if not exists digest_skip_weekends boolean default true,
  add column if not exists digest_last_sent_at timestamptz,
  add column if not exists event_pings_enabled boolean default true,
  add column if not exists muted_lead_emails text[] default '{}',
  add column if not exists muted_until timestamptz;

create index if not exists gmail_accounts_slack_user_idx
  on public.gmail_accounts (slack_user_id)
  where slack_user_id is not null;
