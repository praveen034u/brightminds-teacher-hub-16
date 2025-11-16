-- Debug assignment creation issues
-- Run this in Supabase SQL Editor to diagnose the problem

-- 1. Check if assignments table has the new columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'assignments' 
  AND column_name IN ('assignment_type', 'game_id', 'game_config')
ORDER BY column_name;

-- 2. Check if games table exists and has data
SELECT 'Games count:' as info, count(*) as value FROM games
UNION ALL
SELECT 'Active games:' as info, count(*) as value FROM games WHERE is_active = true;

-- 3. Check if teachers table has mock data
SELECT 'Teachers count:' as info, count(*) as value FROM teachers
UNION ALL
SELECT 'Mock teacher exists:' as info, count(*) as value FROM teachers WHERE auth0_user_id = 'mock-teacher-1';

-- 4. Test game selection
SELECT 
  id,
  name,
  game_type,
  is_active
FROM games 
WHERE is_active = true
LIMIT 3;

-- 5. Test assignment creation manually (run this after the above checks)
/*
INSERT INTO assignments (
  teacher_id, 
  title, 
  description, 
  assignment_type, 
  game_id, 
  game_config, 
  status
) VALUES (
  (SELECT id FROM teachers WHERE auth0_user_id = 'mock-teacher-1' LIMIT 1),
  'Test Game Assignment',
  'Testing game assignment creation',
  'game',
  (SELECT id FROM games WHERE game_type = 'word-scramble' LIMIT 1),
  '{"difficulty": "easy", "category": "General"}',
  'active'
);
*/