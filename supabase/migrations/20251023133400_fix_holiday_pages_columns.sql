-- Add unique_token column if it doesn't exist
ALTER TABLE holiday_pages ADD COLUMN IF NOT EXISTS unique_token TEXT UNIQUE;

-- Add custom_url column if it doesn't exist  
ALTER TABLE holiday_pages ADD COLUMN IF NOT EXISTS custom_url TEXT UNIQUE;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_holiday_pages_unique_token ON holiday_pages(unique_token);
CREATE INDEX IF NOT EXISTS idx_holiday_pages_custom_url ON holiday_pages(custom_url);

-- Add public access policy for published pages if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'holiday_pages' 
        AND policyname = 'Public access to published holiday pages'
    ) THEN
        CREATE POLICY "Public access to published holiday pages" ON holiday_pages
          FOR SELECT USING (status = 'published' AND unique_token IS NOT NULL);
    END IF;
END $$;


