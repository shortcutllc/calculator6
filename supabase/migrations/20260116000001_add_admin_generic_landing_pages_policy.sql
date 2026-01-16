-- Add admin policy for generic_landing_pages to allow authenticated users to update any page
-- This allows admins/team members to edit pages created by others

-- Add admin update policy
CREATE POLICY "Authenticated users can update any generic landing pages" ON generic_landing_pages
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Add admin delete policy
CREATE POLICY "Authenticated users can delete any generic landing pages" ON generic_landing_pages
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add admin view policy
CREATE POLICY "Authenticated users can view all generic landing pages" ON generic_landing_pages
  FOR SELECT USING (auth.role() = 'authenticated');

-- Note: These policies work alongside existing policies, giving authenticated users
-- full access while maintaining public read access for published pages via unique token
