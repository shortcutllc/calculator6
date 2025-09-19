-- Fix remaining authentication issues for complete gallery workflow
-- This ensures all database operations work for unauthenticated gallery users

-- Allow public read access to headshot_notifications (for checking notification history)
CREATE POLICY "headshot_notifications_public_read" ON headshot_notifications
  FOR SELECT USING (true);

-- Allow public insert access to headshot_notifications (for creating notifications)
CREATE POLICY "headshot_notifications_public_insert" ON headshot_notifications
  FOR INSERT WITH CHECK (true);

-- Allow public update access to headshot_events (in case event data needs updating)
CREATE POLICY "headshot_events_public_update" ON headshot_events
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Ensure admin still has full access to all tables
CREATE POLICY "headshot_notifications_admin_all" ON headshot_notifications
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "headshot_events_admin_all" ON headshot_events
  FOR ALL USING (auth.role() = 'authenticated');
