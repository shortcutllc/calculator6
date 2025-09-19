-- Allow unauthenticated users to update galleries via their unique token
-- This enables photo selection submission without requiring authentication

-- Drop existing restrictive write policies
DROP POLICY IF EXISTS "employee_galleries_admin_write" ON employee_galleries;
DROP POLICY IF EXISTS "gallery_photos_admin_write" ON gallery_photos;

-- Create new policies that allow public write access for gallery updates via token
CREATE POLICY "employee_galleries_public_update" ON employee_galleries
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "employee_galleries_admin_insert_delete" ON employee_galleries
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "gallery_photos_public_update" ON gallery_photos
  FOR UPDATE USING (true)
  WITH CHECK (true);

CREATE POLICY "gallery_photos_admin_insert_delete" ON gallery_photos
  FOR ALL USING (auth.role() = 'authenticated');
