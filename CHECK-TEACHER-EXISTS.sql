-- Diagnostic: Check if teacher exists in database

-- Step 1: Check all teachers in database
SELECT id, email, full_name, auth0_user_id, created_at
FROM teachers
ORDER BY created_at DESC;

-- Step 2: Check for your specific auth0_user_id
-- Replace 'auth0|6922a18930a0f585e7640eff' with your actual auth0_user_id from console
SELECT id, email, full_name, auth0_user_id
FROM teachers
WHERE auth0_user_id = 'auth0|6922a18930a0f585e7640eff';

-- Step 3: If no teacher found, check if the column name is different
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'teachers'
ORDER BY ordinal_position;

-- Step 4: If teacher doesn't exist, create one (update values as needed)
-- Uncomment and run this if no teacher record exists:
/*
INSERT INTO teachers (
  id,
  auth0_user_id,
  email,
  full_name,
  school_name,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'auth0|6922a18930a0f585e7640eff',  -- Your auth0 user ID
  'lalit_test@gmail.com',             -- Your email
  'Lalit Test',                        -- Your name
  'BrightMinds School',                -- School name
  now(),
  now()
);
*/

-- Step 5: Verify the insert worked
SELECT id, email, auth0_user_id FROM teachers WHERE email = 'lalit_test@gmail.com';
