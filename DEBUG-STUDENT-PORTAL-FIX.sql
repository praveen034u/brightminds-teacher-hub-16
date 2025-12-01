-- DEBUG: Check what data is in the database
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check if question_papers table exists and has data
SELECT 'question_papers table' as table_name, COUNT(*) as row_count FROM question_papers;
SELECT * FROM question_papers ORDER BY created_at DESC LIMIT 5;

-- 2. Check assignments and their question_paper_id values
SELECT 'assignments table' as table_name, COUNT(*) as row_count FROM assignments;
SELECT 
  id,
  title,
  assignment_type,
  question_paper_id,
  grade,
  status,
  created_at
FROM assignments
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if any assignments have question_paper_id
SELECT 
  COUNT(*) as total_assignments,
  COUNT(question_paper_id) as assignments_with_question_paper,
  COUNT(*) - COUNT(question_paper_id) as assignments_without_question_paper
FROM assignments;

-- 4. Check which assignments need question papers linked
SELECT 
  a.id,
  a.title,
  a.assignment_type,
  a.question_paper_id,
  qp.title as question_paper_title
FROM assignments a
LEFT JOIN question_papers qp ON a.question_paper_id = qp.id
WHERE a.status = 'active'
ORDER BY a.created_at DESC
LIMIT 10;

-- 5. If you need to link an assignment to a question paper, use this template:
-- UPDATE assignments 
-- SET question_paper_id = '<YOUR_QUESTION_PAPER_UUID_HERE>'
-- WHERE id = '<YOUR_ASSIGNMENT_UUID_HERE>';

-- Example (replace with your actual UUIDs):
-- UPDATE assignments 
-- SET question_paper_id = 'abc123-...-xyz789'
-- WHERE title = 'Math Quiz' AND question_paper_id IS NULL;
