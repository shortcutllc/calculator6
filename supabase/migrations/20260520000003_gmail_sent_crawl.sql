-- Inbox crawl: per-rep sync of sent mail (the emails reps type directly into
-- Gmail, outside the companion's Send via Gmail button) into outreach_sends
-- so the follow-up queue + CRM card history reflect ALL real activity, not
-- just companion sends.
--
-- Opt-in per rep (sent_crawl_enabled) — even though gmail.readonly is already
-- granted, scanning the Sent folder is meaningfully more invasive than the
-- push-notification model and deserves an explicit "yes". last_sent_crawl_at
-- powers the daily incremental delta.

alter table public.gmail_accounts
  add column if not exists sent_crawl_enabled bool not null default false,
  add column if not exists last_sent_crawl_at timestamptz;
