-- Create contact_requests table only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contact_requests') THEN
        CREATE TABLE contact_requests (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          company TEXT,
          location TEXT,
          service_type TEXT,
          event_date DATE,
          appointment_count TEXT,
          message TEXT,
          holiday_page_id UUID REFERENCES holiday_pages(id) ON DELETE SET NULL,
          status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'followed_up', 'closed'))
        );
        
        -- Create indexes for better performance
        CREATE INDEX idx_contact_requests_holiday_page_id ON contact_requests(holiday_page_id);
        CREATE INDEX idx_contact_requests_created_at ON contact_requests(created_at);
        CREATE INDEX idx_contact_requests_status ON contact_requests(status);
        CREATE INDEX idx_contact_requests_email ON contact_requests(email);
        
        -- Enable RLS
        ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view contact requests for their holiday pages" ON contact_requests
          FOR SELECT USING (
            holiday_page_id IN (
              SELECT id FROM holiday_pages WHERE user_id = auth.uid()
            )
          );
        
        CREATE POLICY "Anyone can create contact requests" ON contact_requests
          FOR INSERT WITH CHECK (true);
        
        CREATE POLICY "Users can update contact requests for their holiday pages" ON contact_requests
          FOR UPDATE USING (
            holiday_page_id IN (
              SELECT id FROM holiday_pages WHERE user_id = auth.uid()
            )
          );
        
        RAISE NOTICE 'contact_requests table created successfully';
    ELSE
        RAISE NOTICE 'contact_requests table already exists, skipping creation';
    END IF;
END $$;


