-- Add phone number column for SMS reminders
ALTER TABLE pro_agreements
ADD COLUMN IF NOT EXISTS pro_phone TEXT DEFAULT NULL;
