-- =====================================================
-- ULTRA SIMPLE: Find UUIDs and Link Assignments
-- =====================================================
-- This version handles all possible table structures
-- Run each section ONE AT A TIME

-- =====================================================
-- SECTION 1: Find Your Question Paper UUIDs
-- =====================================================
-- Copy-paste and run this:

SELECT 
  id,
  title,
  teacher_id,
  created_at
FROM question_papers
ORDER BY created_at DESC
LIMIT 20;

-- Look at the 'id' column - that's your QUESTION_PAPER_UUID
-- Example: abc12345-1234-5678-90ab-cdef12345678

-- =====================================================
-- SECTION 2: Find Your Assignment UUIDs  
-- =====================================================
-- Copy-paste and run this:

SELECT 
  id,
  title,
  assignment_type,
  question_paper_id,
  status,
  created_at
FROM assignments
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 20;

-- Look at the 'id' column - that's your ASSIGNMENT_UUID
-- Look at 'question_paper_id' - if it's NULL, it needs linking!

-- =====================================================
-- SECTION 3: Link One Assignment to One Question Paper
-- =====================================================
-- Replace the two UUIDs below with your actual values:

-- UPDATE assignments 
-- SET question_paper_id = 'YOUR_QUESTION_PAPER_ID_FROM_SECTION_1'
-- WHERE id = 'YOUR_ASSIGNMENT_ID_FROM_SECTION_2';

-- Remove the -- at the start of the UPDATE line to run it!

-- =====================================================
-- SECTION 4: Verify It Worked
-- =====================================================
-- Copy-paste and run this:

SELECT 
  a.id as assignment_id,
  a.title as assignment_title,
  a.question_paper_id,
  qp.title as question_paper_title
FROM assignments a
LEFT JOIN question_papers qp ON a.question_paper_id = qp.id
WHERE a.status = 'active'
ORDER BY a.created_at DESC
LIMIT 10;

-- If question_paper_id is NOT NULL and question_paper_title shows a name, it worked! ✅

-- =====================================================
-- BONUS: Check if you have any question papers
-- =====================================================

SELECT COUNT(*) as total_question_papers FROM question_papers;

-- If this returns 0, you need to create a question paper first!
-- Go to the Question Papers page in your app.

-- =====================================================
-- REAL EXAMPLE WITH COPY-PASTE READY CODE
-- =====================================================
-- Let's say Section 1 showed you:
-- id: 123e4567-e89b-12d3-a456-426614174000
-- title: "Math Quiz"

-- And Section 2 showed you:
-- id: 987fcdeb-51a2-43c7-9012-345678901234
-- title: "Week 1 Assignment"
-- question_paper_id: NULL

-- Then your UPDATE would be:
/*
UPDATE assignments 
SET question_paper_id = '123e4567-e89b-12d3-a456-426614174000'
WHERE id = '987fcdeb-51a2-43c7-9012-345678901234';
*/

-- =====================================================
-- MULTIPLE ASSIGNMENTS - SAME QUESTION PAPER
-- =====================================================
-- If you want to link multiple assignments to the same question paper:
/*
UPDATE assignments 
SET question_paper_id = 'YOUR_QUESTION_PAPER_UUID'
WHERE id IN (
  'ASSIGNMENT_UUID_1',
  'ASSIGNMENT_UUID_2',
  'ASSIGNMENT_UUID_3'
);
*/
