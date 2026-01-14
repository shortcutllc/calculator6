-- Quick verification query to check if is_returning_client column exists
-- Run this in Supabase SQL Editor to verify the column exists

-- Check if column exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'generic_landing_pages' 
AND column_name = 'is_returning_client';

-- If the above returns a row, the column exists. If it returns nothing, run the migration.

-- Also check current values
SELECT 
    id,
    data->>'partnerName' as partner_name,
    is_returning_client,
    created_at
FROM generic_landing_pages
ORDER BY created_at DESC
LIMIT 10;
