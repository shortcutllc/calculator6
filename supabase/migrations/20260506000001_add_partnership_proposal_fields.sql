-- Adds two columns to support "partnership" proposals — a new pricing model
-- where employees pay per-service directly and the employer's commitment is
-- either a per-unfilled-appointment fee (Model A) or a flat hourly rate per
-- pro that subsidizes the employee price (Model B). See PartnershipModelsSection.
-- 2026-05-06

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS partnership_type TEXT
    CHECK (partnership_type IN ('employee_pay', 'subsidized', 'dual')),
  ADD COLUMN IF NOT EXISTS partnership_rates JSONB;

-- Backfill nothing — existing proposals stay NULL and continue rendering the
-- standard cost summary. Only proposals with a non-null partnership_type swap
-- in the partnership pricing card.

COMMENT ON COLUMN proposals.partnership_type IS
  'Partnership pricing mode: employee_pay (Model A only), subsidized (Model B only), dual (both side-by-side). NULL = standard proposal.';

COMMENT ON COLUMN proposals.partnership_rates IS
  'Optional per-deal rate overrides. Shape: { modelA: { employeePay, employerPerUnfilledAppt }, modelB: { employeePay, employerHourlyPerPro } }. NULL = use built-in defaults.';
