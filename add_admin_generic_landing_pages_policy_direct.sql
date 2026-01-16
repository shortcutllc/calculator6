-- Run this directly in Supabase SQL Editor
-- Add admin policies for generic_landing_pages to allow authenticated users to update any page

-- Add admin update policy
CREATE POLICY "Authenticated users can update any generic landing pages" ON generic_landing_pages
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Add admin delete policy
CREATE POLICY "Authenticated users can delete any generic landing pages" ON generic_landing_pages
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add admin view policy
CREATE POLICY "Authenticated users can view all generic landing pages" ON generic_landing_pages
  FOR SELECT USING (auth.role() = 'authenticated');

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'generic_landing_pages'
ORDER BY policyname;
