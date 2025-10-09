-- Allow photographer token holders to write to headshot data
-- This enables photographers to upload photos and manage galleries without full authentication

-- Allow photographer token holders to insert/update employee galleries
CREATE POLICY "employee_galleries_photographer_write" ON employee_galleries
  FOR ALL USING (true)
  WITH CHECK (true);

-- Allow photographer token holders to insert/update gallery photos
CREATE POLICY "gallery_photos_photographer_write" ON gallery_photos
  FOR ALL USING (true)
  WITH CHECK (true);

-- Allow photographer token holders to insert/update headshot events
CREATE POLICY "headshot_events_photographer_write" ON headshot_events
  FOR ALL USING (true)
  WITH CHECK (true);

-- Allow photographer token holders to insert notifications
CREATE POLICY "headshot_notifications_photographer_write" ON headshot_notifications
  FOR ALL USING (true)
  WITH CHECK (true);

-- Allow photographer token holders to upload photos to storage
CREATE POLICY "headshot_photos_photographer_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'headshot-photos');

-- Allow photographer token holders to update photos in storage
CREATE POLICY "headshot_photos_photographer_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'headshot-photos')
  WITH CHECK (bucket_id = 'headshot-photos');

-- Allow photographer token holders to delete photos from storage
CREATE POLICY "headshot_photos_photographer_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'headshot-photos');

