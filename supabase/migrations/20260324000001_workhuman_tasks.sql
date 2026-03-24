-- Workhuman Live 2026 project management tasks
CREATE TABLE workhuman_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  completed boolean DEFAULT false,
  budget numeric,
  section text NOT NULL CHECK (section IN ('travel_logistics', 'operations_staffing', 'outreach_sales', 'booth_design', 'digital_builds', 'open_items')),
  budget_category text CHECK (budget_category IN ('booth_swag', 'travel_lodging', 'sponsorship', 'pro_cost') OR budget_category IS NULL),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_workhuman_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workhuman_tasks_updated_at
  BEFORE UPDATE ON workhuman_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_workhuman_tasks_updated_at();

-- RLS
ALTER TABLE workhuman_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON workhuman_tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON workhuman_tasks
  FOR ALL TO anon USING (true) WITH CHECK (true);
