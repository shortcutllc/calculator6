-- Play B is four different sales situations, not one list. Tag each row at
-- generate-time so the page can badge + filter + sort by where the
-- relationship actually stands (a seller's first question on any lead):
--   engagement_state:
--     'replied'   = we emailed AND they replied (warmest; never closed)
--     'no_reply'  = we emailed, silence (needs a new angle)
--     'net_new'   = freshly sourced (apollo-leadgen), never touched
--     're_engage' = in our corpus but we never actually emailed them
--   priority when overlapping: replied > no_reply > net_new > re_engage

alter table public.crm_play_b
  add column if not exists engagement_state   text,
  add column if not exists touches            int,
  add column if not exists last_contacted_at  timestamptz,
  add column if not exists reply_sentiment    text,
  add column if not exists is_leadgen         boolean default false;

create index if not exists crm_play_b_engagement_idx
  on public.crm_play_b (engagement_state);
