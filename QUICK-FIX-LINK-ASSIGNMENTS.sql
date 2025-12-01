-- =====================================================
-- QUICK FIX: Link Assignments to Question Papers
-- =====================================================
-- This script will help you quickly fix the student portal issue
-- by linking your assignments to question papers

-- STEP 1: Check what you have
-- =====================================================
-- See all your question papers
SELECT 
  id as question_paper_id,
  title as paper_title,
  question_count,
  grade,
  created_at
FROM question_papers
ORDER BY created_at DESC;

-- See all your assignments that need linking
SELECT 
  id as assignment_id,
  title as assignment_title,
  assignment_type,
  question_paper_id,
  grade,
  status,
  created_at
FROM assignments
WHERE status = 'active'
  AND question_paper_id IS NULL
ORDER BY created_at DESC;

-- STEP 2: Link them together
-- =====================================================
-- Copy a question_paper_id from above
-- Copy an assignment_id from above  
-- Run this UPDATE (replace the UUIDs):

-- Template (don't run this, use it as a guide):
-- UPDATE assignments 
-- SET question_paper_id = 'YOUR_QUESTION_PAPER_UUID'
-- WHERE id = 'YOUR_ASSIGNMENT_UUID';

-- Example with actual UUIDs (REPLACE THESE!):
/*
UPDATE assignments 
SET question_paper_id = 'abc12345-1234-1234-1234-123456789abc'
WHERE id = 'def67890-5678-5678-5678-567890123def';
*/

-- STEP 3: Verify it worked
-- =====================================================
SELECT 
  a.id,
  a.title as assignment_title,
  a.question_paper_id,
  qp.title as question_paper_title,
  qp.question_count
FROM assignments a
LEFT JOIN question_papers qp ON a.question_paper_id = qp.id
WHERE a.status = 'active'
ORDER BY a.created_at DESC
LIMIT 10;

-- You should see the question_paper_title filled in now!

-- STEP 4: If you still have NULL values, check this:
-- =====================================================
-- Check if question_papers table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'question_papers'
) as table_exists;

-- Check if question_paper_id column exists on assignments
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_name = 'assignments' 
    AND column_name = 'question_paper_id'
) as column_exists;

-- If either is false, you need to run the migration scripts first!

-- =====================================================
-- BONUS: Create a test question paper if you don't have one
-- =====================================================
-- Replace 'YOUR_TEACHER_AUTH0_ID' with your actual teacher ID
/*
INSERT INTO question_papers (
  teacher_id, 
  title, 
  description, 
  grade, 
  subject, 
  questions, 
  total_marks
)
VALUES (
  'YOUR_TEACHER_AUTH0_ID',
  'Quick Math Test',
  'Basic math questions for testing',
  'Grade 8',
  'Mathematics',
  '[
    {
      "id": 1,
      "question": "What is 10 + 15?",
      "type": "short_answer",
      "correct_answer": "25",
      "marks": 1
    },
    {
      "id": 2,
      "question": "What is 7 x 8?",
      "type": "short_answer",
      "correct_answer": "56",
      "marks": 2
    },
    {
      "id": 3,
      "question": "Which is larger: 100 or 99?",
      "type": "mcq",
      "options": ["99", "100", "Both equal"],
      "correct_answer": "100",
      "marks": 1
    }
  ]'::jsonb,
  4
)
RETURNING id, title, question_count;
*/

-- Copy the returned 'id' and use it in STEP 2 to link assignments!
