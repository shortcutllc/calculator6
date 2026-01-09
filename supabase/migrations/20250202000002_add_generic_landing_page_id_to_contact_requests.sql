-- Add generic_landing_page_id column to contact_requests table
ALTER TABLE contact_requests 
ADD COLUMN IF NOT EXISTS generic_landing_page_id UUID REFERENCES generic_landing_pages(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_contact_requests_generic_landing_page_id ON contact_requests(generic_landing_page_id);

-- Update RLS policies to include generic landing pages
DROP POLICY IF EXISTS "Users can view contact requests for their holiday pages" ON contact_requests;
CREATE POLICY "Users can view contact requests for their pages" ON contact_requests
  FOR SELECT USING (
    holiday_page_id IN (
      SELECT id FROM holiday_pages WHERE user_id = auth.uid()
    )
    OR
    generic_landing_page_id IN (
      SELECT id FROM generic_landing_pages WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update contact requests for their holiday pages" ON contact_requests;
CREATE POLICY "Users can update contact requests for their pages" ON contact_requests
  FOR UPDATE USING (
    holiday_page_id IN (
      SELECT id FROM holiday_pages WHERE user_id = auth.uid()
    )
    OR
    generic_landing_page_id IN (
      SELECT id FROM generic_landing_pages WHERE user_id = auth.uid()
    )
  );



