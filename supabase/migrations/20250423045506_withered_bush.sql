/*
  # Create default user account with username
  
  1. Creates a new user account with username instead of email
  2. Sets up initial auth configuration
*/

-- Create the user with proper auth schema handling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE raw_user_meta_data->>'username' = 'shortcut'
  ) THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    )
    VALUES (
      gen_random_uuid(),
      'shortcut@example.com',
      crypt('LouieJack1!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"username":"shortcut"}',
      'authenticated',
      'authenticated'
    );
  END IF;
END $$;