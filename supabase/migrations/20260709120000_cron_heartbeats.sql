-- cron_heartbeats — a dead-man's-switch for the outreach cron jobs.
-- Each critical job stamps its name + timestamp on successful completion; the
-- Netlify cron-heartbeat-monitor (always-on, machine-independent) reads this and
-- Slack-alerts Will if any job goes stale (e.g. the local Mac cron was asleep).
create table if not exists cron_heartbeats (
  job_name    text primary key,
  last_run_at timestamptz not null default now(),
  status      text not null default 'ok',   -- 'ok' | 'error'
  note        text,                          -- optional detail (counts, error msg)
  host        text                           -- 'netlify' | 'local-mac' etc.
);

comment on table cron_heartbeats is
  'Last successful run per outreach cron job. Written by each job; read by cron-heartbeat-monitor to alert on silent failures.';
