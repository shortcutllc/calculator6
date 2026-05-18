-- Step 5 scoring: a transparent 0–100 fit score per company = weighted blend
-- of trajectory (30) / recency (25) / title-fit (25) / firmographic-fit (20),
-- learned from the recency-weighted winner profile. fit_breakdown stores the
-- sub-scores + raw inputs so any score is explainable and the weights tunable.

alter table public.crm_companies
  add column if not exists fit_score      numeric,
  add column if not exists fit_breakdown  jsonb,
  add column if not exists scored_at      timestamptz;

create index if not exists crm_companies_fit_score_idx on public.crm_companies (fit_score desc);
