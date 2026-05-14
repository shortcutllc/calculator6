-- ---------------------------------------------------------------------------
-- Raise the proposal-gallery storage bucket file-size limit to 500MB so
-- staff can drop in longer recap videos. Default Supabase bucket cap is
-- 50MB which rejects most video uploads with a 413.
--
-- Also explicitly allowlists image + video MIME types so the storage layer
-- 415s anything else early (PDFs, audio, archives) before we burn bandwidth.
-- ---------------------------------------------------------------------------

update storage.buckets
   set file_size_limit = 524288000,  -- 500 MB
       allowed_mime_types = array[
         'image/png',
         'image/jpeg',
         'image/webp',
         'image/gif',
         'image/svg+xml',
         'video/mp4',
         'video/quicktime',
         'video/webm'
       ]
 where id = 'proposal-gallery';
