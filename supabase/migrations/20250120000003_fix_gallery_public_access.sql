-- Fix RLS policies to allow public access to employee galleries via token
-- This allows unauthenticated users to access gallery links

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "employee_galleries_admin_access" ON employee_galleries;
DROP POLICY IF EXISTS "gallery_photos_admin_access" ON gallery_photos;

-- Create new policies that allow public access for gallery viewing
CREATE POLICY "employee_galleries_public_read" ON employee_galleries
  FOR SELECT USING (true);

CREATE POLICY "employee_galleries_admin_write" ON employee_galleries
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "gallery_photos_public_read" ON gallery_photos
  FOR SELECT USING (true);

CREATE POLICY "gallery_photos_admin_write" ON gallery_photos
  FOR ALL USING (auth.role() = 'authenticated');

-- Also allow public read access to headshot_events for event data
CREATE POLICY "headshot_events_public_read" ON headshot_events
  FOR SELECT USING (true);

-- Update storage policy to allow public read access to photos
DROP POLICY IF EXISTS "headshot_photos_admin_access" ON storage.objects;
CREATE POLICY "headshot_photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'headshot-photos');

CREATE POLICY "headshot_photos_admin_write" ON storage.objects
  FOR ALL USING (auth.role() = 'authenticated');
