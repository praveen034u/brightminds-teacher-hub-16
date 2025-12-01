-- =====================================================
-- HOW TO FIND YOUR ASSIGNMENT AND QUESTION PAPER UUIDs
-- =====================================================
-- Run these queries in Supabase SQL Editor
-- Copy the UUIDs from the results

-- =====================================================
-- STEP 1: Find Your Question Paper UUIDs
-- =====================================================
SELECT 
  id as "📄 QUESTION_PAPER_UUID (Copy This!)",
  title as "Question Paper Title",
  jsonb_array_length(questions) as "Number of Questions",
  grade,
  created_at
FROM question_papers
ORDER BY created_at DESC;

-- ✅ Copy the 'id' column value - it looks like: 
-- abc12345-1234-1234-1234-1234567890ab

-- =====================================================
-- STEP 2: Find Your Assignment UUIDs (That Need Linking)
-- =====================================================
SELECT 
  id as "📝 ASSIGNMENT_UUID (Copy This!)",
  title as "Assignment Title",
  assignment_type as "Type",
  question_paper_id as "Currently Linked To (NULL = needs fixing)",
  grade,
  status,
  created_at
FROM assignments
WHERE status = 'active'
  AND question_paper_id IS NULL  -- Only show assignments that need linking
ORDER BY created_at DESC;

-- ✅ Copy the 'id' column value

-- =====================================================
-- STEP 3: Now Use These UUIDs to Link Them
-- =====================================================
-- Copy one QUESTION_PAPER_UUID from Step 1
-- Copy one ASSIGNMENT_UUID from Step 2
-- Replace in the template below:

/*
UPDATE assignments 
SET question_paper_id = 'PASTE_QUESTION_PAPER_UUID_HERE'
WHERE id = 'PASTE_ASSIGNMENT_UUID_HERE';
*/

-- =====================================================
-- REAL EXAMPLE (Don't run this, it's just an example):
-- =====================================================
/*
-- From Step 1, I got: abc12345-1234-1234-1234-1234567890ab
-- From Step 2, I got: def67890-5678-5678-5678-567890123def

UPDATE assignments 
SET question_paper_id = 'abc12345-1234-1234-1234-1234567890ab'
WHERE id = 'def67890-5678-5678-5678-567890123def';
*/

-- =====================================================
-- STEP 4: Verify It Worked
-- =====================================================
SELECT 
  a.id,
  a.title as assignment_title,
  a.question_paper_id,
  qp.title as question_paper_title,
  '✅ LINKED!' as status
FROM assignments a
INNER JOIN question_papers qp ON a.question_paper_id = qp.id
WHERE a.status = 'active'
ORDER BY a.created_at DESC;

-- If you see rows here, it worked! ✅

-- =====================================================
-- BONUS: What if I have NO question papers?
-- =====================================================
-- Check if you have any question papers at all:
SELECT COUNT(*) as total_question_papers FROM question_papers;

-- If this returns 0, you need to create a question paper first!
-- Go to the Question Papers page in your app and create one.
-- OR run this to create a test question paper:

/*
-- Replace 'YOUR_TEACHER_AUTH0_ID' with your actual teacher ID
-- You can find your teacher ID by running:
SELECT auth0_user_id FROM teachers LIMIT 1;

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
  'Quick Test Paper',
  'Test questions for debugging',
  'Grade 8',
  'General',
  '[
    {
      "id": 1,
      "question": "What is 5 + 5?",
      "type": "short_answer",
      "correct_answer": "10",
      "marks": 1
    },
    {
      "id": 2,
      "question": "What is the capital of France?",
      "type": "mcq",
      "options": ["London", "Paris", "Berlin", "Madrid"],
      "correct_answer": "Paris",
      "marks": 2
    }
  ]'::jsonb,
  3
)
RETURNING id as "📄 NEW_QUESTION_PAPER_UUID", title;

-- Copy the 'id' returned and use it in Step 3!
*/

-- =====================================================
-- SUMMARY: How to Read the Results
-- =====================================================
-- Step 1 results look like this:
-- ┌──────────────────────────────────────┬─────────────────────┬──────────┐
-- │ QUESTION_PAPER_UUID                  │ Question Paper Title│ Count    │
-- ├──────────────────────────────────────┼─────────────────────┼──────────┤
-- │ abc12345-1234-1234-1234-123456789abc │ Math Quiz          │ 5        │
-- │ def67890-5678-5678-5678-567890123def │ Science Test       │ 10       │
-- └──────────────────────────────────────┴─────────────────────┴──────────┘
--    👆 THIS IS THE UUID YOU NEED!

-- Step 2 results look like this:
-- ┌──────────────────────────────────────┬───────────────────┬──────────┐
-- │ ASSIGNMENT_UUID                      │ Assignment Title  │ Type     │
-- ├──────────────────────────────────────┼───────────────────┼──────────┤
-- │ xyz12345-9999-8888-7777-666655554444 │ Week 1 Assignment │ custom   │
-- │ uvw67890-1111-2222-3333-444455556666 │ Practice Test     │ custom   │
-- └──────────────────────────────────────┴───────────────────┴──────────┘
--    👆 THIS IS THE UUID YOU NEED!
