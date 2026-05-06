-- Allows partnership_type = 'tri' for proposals that show all three options
-- (Employees Pay Full / You Subsidize Half / Fully Employer-Paid).
-- 2026-05-06

ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_partnership_type_check;

ALTER TABLE proposals
  ADD CONSTRAINT proposals_partnership_type_check
  CHECK (partnership_type IN ('employee_pay', 'subsidized', 'dual', 'tri'));
