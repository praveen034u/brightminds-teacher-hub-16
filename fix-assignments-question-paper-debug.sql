-- QUICK FIX: Verify and Update Assignments with Question Papers
-- Run these queries in Supabase SQL Editor

-- ============================================
-- STEP 1: Check if columns exist
-- ============================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'assignments' 
AND column_name IN ('question_paper_id', 'assignment_type', 'grade')
ORDER BY column_name;

-- If no results, run the migration:
-- ALTER TABLE assignments ADD COLUMN IF NOT EXISTS question_paper_id UUID REFERENCES question_papers(id);
-- ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(50) DEFAULT 'custom';
-- ALTER TABLE assignments ADD COLUMN IF NOT EXISTS grade VARCHAR(10);


-- ============================================
-- STEP 2: See all your question papers
-- ============================================
SELECT 
  id,
  title,
  description,
  jsonb_array_length(questions) as question_count,
  created_at
FROM question_papers
ORDER BY created_at DESC
LIMIT 10;


-- ============================================
-- STEP 3: See all your assignments
-- ============================================
SELECT 
  id,
  title,
  description,
  assignment_type,
  question_paper_id,
  grade,
  status,
  due_date,
  CASE 
    WHEN question_paper_id IS NOT NULL THEN '✅ Has Question Paper'
    ELSE '❌ No Question Paper'
  END as paper_status
FROM assignments
ORDER BY created_at DESC
LIMIT 20;


-- ============================================
-- STEP 4: Find assignments WITHOUT question_paper_id
-- (These need to be linked)
-- ============================================
SELECT 
  id,
  title,
  description,
  assignment_type,
  status
FROM assignments
WHERE question_paper_id IS NULL
ORDER BY created_at DESC;


-- ============================================
-- STEP 5: Link a specific assignment to a question paper
-- ============================================
-- REPLACE <assignment-id> and <question-paper-id> with actual IDs

-- Example:
-- UPDATE assignments
-- SET 
--   question_paper_id = '123e4567-e89b-12d3-a456-426614174000',
--   assignment_type = 'custom',
--   grade = '10'
-- WHERE id = '987f6543-e21c-34d5-b678-987654321000';


-- ============================================
-- STEP 6: Verify the update worked
-- ============================================
-- REPLACE <assignment-id> with your assignment ID

-- SELECT 
--   a.id,
--   a.title as assignment_title,
--   a.assignment_type,
--   a.question_paper_id,
--   qp.title as question_paper_title,
--   jsonb_array_length(qp.questions) as question_count
-- FROM assignments a
-- LEFT JOIN question_papers qp ON qp.id = a.question_paper_id
-- WHERE a.id = '<assignment-id>';


-- ============================================
-- STEP 7: BULK UPDATE - Link all assignments to question papers
-- (If you want to link multiple assignments at once)
-- ============================================

-- Option A: Link ALL custom assignments to a specific question paper
-- UPDATE assignments
-- SET question_paper_id = '<your-default-question-paper-id>'
-- WHERE assignment_type = 'custom' 
-- AND question_paper_id IS NULL;

-- Option B: Link assignments by title pattern
-- UPDATE assignments
-- SET question_paper_id = '<question-paper-id>'
-- WHERE title LIKE '%Math%' 
-- AND question_paper_id IS NULL;


-- ============================================
-- STEP 8: Verify students can see the assignments
-- ============================================
-- Check if assignment is in a room with students

-- SELECT 
--   a.id as assignment_id,
--   a.title as assignment_title,
--   r.name as room_name,
--   COUNT(rs.student_id) as student_count,
--   CASE 
--     WHEN a.question_paper_id IS NOT NULL THEN '✅ Has Question Paper'
--     ELSE '❌ No Question Paper'
--   END as paper_status
-- FROM assignments a
-- LEFT JOIN rooms r ON r.id = a.room_id
-- LEFT JOIN room_students rs ON rs.room_id = r.id
-- WHERE a.id = '<assignment-id>'
-- GROUP BY a.id, a.title, r.name, a.question_paper_id;


-- ============================================
-- STEP 9: Check assignment attempts (after students try to start)
-- ============================================
-- SELECT 
--   aa.*,
--   a.title as assignment_title,
--   s.name as student_name
-- FROM assignment_attempts aa
-- JOIN assignments a ON a.id = aa.assignment_id
-- JOIN students s ON s.id = aa.student_id
-- WHERE a.question_paper_id IS NOT NULL
-- ORDER BY aa.started_at DESC
-- LIMIT 10;


-- ============================================
-- TROUBLESHOOTING QUERIES
-- ============================================

-- Find question papers with their question details
-- SELECT 
--   id,
--   title,
--   questions
-- FROM question_papers
-- WHERE id = '<question-paper-id>';


-- Find all assignments for a specific room
-- SELECT 
--   a.*,
--   qp.title as question_paper_title
-- FROM assignments a
-- LEFT JOIN question_papers qp ON qp.id = a.question_paper_id
-- WHERE a.room_id = '<room-id>'
-- ORDER BY a.created_at DESC;


-- Check if a question paper has questions
-- SELECT 
--   id,
--   title,
--   CASE 
--     WHEN questions IS NULL THEN 'NULL'
--     WHEN jsonb_array_length(questions) = 0 THEN 'Empty Array'
--     ELSE jsonb_array_length(questions)::text || ' questions'
--   END as questions_status
-- FROM question_papers;


-- ============================================
-- QUICK FIX: Reset assignment_type to NULL
-- (Forces our new logic to work based on question_paper_id only)
-- ============================================
-- UPDATE assignments
-- SET assignment_type = NULL
-- WHERE question_paper_id IS NOT NULL;
-- This makes the fix work immediately without checking assignment_type
