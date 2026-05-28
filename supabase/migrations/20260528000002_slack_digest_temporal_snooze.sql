-- Per-lead temporary snoozes for Phase 2 Slack notification buttons.
--
-- Background: Phase 1 only had global snooze (muted_until — all pings off
-- for N hours) and permanent per-lead mutes (muted_lead_emails — array of
-- emails). Phase 2 adds "snooze this one lead for 1 day / 7 days" buttons
-- on every digest item. Those are temporal, per-lead, automatic-expiry.
--
-- Shape: { "lead-email@x.com": "2026-06-04T13:00:00Z", ... }
-- Read: lead is snoozed iff now() < muted_until_by_lead[email].
-- Write: button click POSTs to slack-interactivity → upsert key with the
--        target time. Past entries are harmless (the time check ignores
--        them) but the function cleans them up opportunistically.

alter table public.gmail_accounts
  add column if not exists muted_until_by_lead jsonb default '{}'::jsonb;
