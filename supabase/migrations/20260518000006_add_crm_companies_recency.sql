-- Recency as a first-class dimension. Lifetime completed-event counts treat a
-- churned-since-2019 account (e.g. most WeWork) the same as an active one,
-- which corrupts ICP/lookalike and especially Play A (expanding a client who
-- hasn't booked in years is a re-activation, not a warm expansion).
--
-- activity_status: active (last completed <=18mo) | lapsed (<=36mo) |
--                  churned (>36mo) | never_completed

alter table public.crm_companies
  add column if not exists activity_status      text,
  add column if not exists completed_last_12mo  int,
  add column if not exists completed_last_24mo  int;

create index if not exists crm_companies_activity_status_idx
  on public.crm_companies (activity_status);
