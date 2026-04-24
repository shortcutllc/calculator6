-- Internal dev tasks: a lightweight ticket/brief system for handing work to developers.
-- Authenticated-only; no public access.
CREATE TABLE IF NOT EXISTS dev_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'in_progress', 'blocked', 'done', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee TEXT,
  due_date DATE,
  tags TEXT[] DEFAULT '{}'::text[],
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_dev_tasks_user_id ON dev_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_status ON dev_tasks(status);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_priority ON dev_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_created_at ON dev_tasks(created_at DESC);

ALTER TABLE dev_tasks ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read/write dev tasks — this is an internal admin tool.
CREATE POLICY "Authenticated users can view dev tasks" ON dev_tasks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create dev tasks" ON dev_tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update dev tasks" ON dev_tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete dev tasks" ON dev_tasks
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE TRIGGER update_dev_tasks_updated_at BEFORE UPDATE
    ON dev_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
