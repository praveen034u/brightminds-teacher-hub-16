-- Quick test to verify games table setup
-- Run this in your Supabase SQL Editor to test the implementation

-- Check if games table exists and has data
SELECT 'Games table test' as test_name, count(*) as game_count FROM games;

-- View all games with their properties
SELECT 
  name,
  game_type,
  array_length(categories, 1) as category_count,
  array_length(skills, 1) as skill_count,
  is_active
FROM games 
ORDER BY name;

-- Test game categories
SELECT 
  name,
  categories
FROM games 
WHERE array_length(categories, 1) > 1;

-- Check if assignments table has been updated
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'assignments' 
  AND column_name IN ('assignment_type', 'game_id', 'game_config')
ORDER BY column_name;

-- Test creating a sample game assignment (optional)
-- INSERT INTO assignments (
--   teacher_id, 
--   title, 
--   description, 
--   assignment_type, 
--   game_id, 
--   game_config, 
--   status
-- ) VALUES (
--   (SELECT id FROM teachers LIMIT 1),
--   'Test Word Scramble Assignment',
--   'Practice vocabulary with word scrambles',
--   'game',
--   (SELECT id FROM games WHERE game_type = 'word-scramble' LIMIT 1),
--   '{"difficulty": "medium", "category": "General"}',
--   'active'
-- );