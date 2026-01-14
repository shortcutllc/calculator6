-- DIRECT SQL COMMAND - Run this in Supabase SQL Editor RIGHT NOW
-- This will add the column immediately without waiting for migrations

-- Step 1: Add the column (if it doesn't exist)
ALTER TABLE generic_landing_pages
ADD COLUMN IF NOT EXISTS is_returning_client BOOLEAN DEFAULT false;

-- Step 2: Update any NULL values to false
UPDATE generic_landing_pages
SET is_returning_client = false
WHERE is_returning_client IS NULL;

-- Step 3: Make it NOT NULL
ALTER TABLE generic_landing_pages
ALTER COLUMN is_returning_client SET NOT NULL;

-- Step 4: Set default for future rows
ALTER TABLE generic_landing_pages
ALTER COLUMN is_returning_client SET DEFAULT false;

-- Step 5: Add index for performance
CREATE INDEX IF NOT EXISTS idx_generic_landing_pages_returning
ON generic_landing_pages(is_returning_client);

-- Step 6: Add documentation
COMMENT ON COLUMN generic_landing_pages.is_returning_client IS
'Whether this landing page is for a returning client (true) or new client (false). Affects personalization and messaging.';

-- VERIFICATION: Run this to confirm it worked
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'generic_landing_pages' 
AND column_name = 'is_returning_client';

-- Should return one row with:
-- column_name: is_returning_client
-- data_type: boolean
-- is_nullable: NO
-- column_default: false
