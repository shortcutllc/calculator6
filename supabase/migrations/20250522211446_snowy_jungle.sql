-- Update storage bucket configuration to increase file size limit
UPDATE storage.buckets
SET file_size_limit = 52428800  -- 50MB in bytes
WHERE id = 'brochures';

-- Ensure the bucket exists with the new limit
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('brochures', 'brochures', true, 52428800)
ON CONFLICT (id) DO UPDATE 
SET file_size_limit = 52428800;