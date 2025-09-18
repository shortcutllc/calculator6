-- Fix the email and phone data that got swapped during CSV upload
-- This swaps the email and phone columns for records where:
-- - email field contains only numbers (phone number)
-- - phone field contains @ (email address)

UPDATE employee_galleries 
SET 
  email = phone,
  phone = email
WHERE 
  email ~ '^[0-9]+$'  -- email field contains only numbers (phone number)
  AND phone ~ '@'     -- phone field contains @ (email address)
  AND phone IS NOT NULL;

-- Show the results to verify the fix
SELECT id, employee_name, email, phone FROM employee_galleries;
