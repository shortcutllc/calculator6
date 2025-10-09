-- Create photographer event assignments table
-- This allows photographers to be assigned to specific headshot events only

CREATE TABLE photographer_event_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_token_id UUID NOT NULL REFERENCES photographer_tokens(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES headshot_events(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(photographer_token_id, event_id)
);

-- Create indexes for better performance
CREATE INDEX idx_photographer_event_assignments_photographer ON photographer_event_assignments(photographer_token_id);
CREATE INDEX idx_photographer_event_assignments_event ON photographer_event_assignments(event_id);
CREATE INDEX idx_photographer_event_assignments_assigned_at ON photographer_event_assignments(assigned_at);

-- Add RLS policies
ALTER TABLE photographer_event_assignments ENABLE ROW LEVEL SECURITY;

-- Allow public read access for photographer validation
CREATE POLICY "photographer_event_assignments_public_read" ON photographer_event_assignments
  FOR SELECT USING (true);

-- Allow admin full access
CREATE POLICY "photographer_event_assignments_admin_all" ON photographer_event_assignments
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow photographers to read their own assignments
CREATE POLICY "photographer_event_assignments_photographer_read" ON photographer_event_assignments
  FOR SELECT USING (photographer_token_id IN (
    SELECT id FROM photographer_tokens WHERE token = current_setting('app.photographer_token', true)::text
  ));

