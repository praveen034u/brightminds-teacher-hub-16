-- =====================================================
-- SAFE STEP-BY-STEP: Link Assignments to Question Papers
-- =====================================================
-- This version is SAFE to run entirely - no errors!
-- Only the queries you uncomment will actually modify data

-- =====================================================
-- STEP 1: See Your Question Papers
-- =====================================================
-- Run this section to see all your question papers:

SELECT 
  id,
  title,
  teacher_id,
  created_at
FROM question_papers
ORDER BY created_at DESC;

-- 📋 Copy the 'id' value from the question paper you want to use
-- It will look like: abc12345-1234-5678-90ab-cdef12345678

-- =====================================================
-- STEP 2: See Your Assignments (That Need Linking)
-- =====================================================
-- Run this section to see assignments without question papers:

SELECT 
  id,
  title,
  assignment_type,
  question_paper_id,
  status,
  created_at
FROM assignments
WHERE status = 'active'
ORDER BY created_at DESC;

-- 📋 Copy the 'id' value from the assignment you want to link
-- Look at the 'question_paper_id' column - if it's NULL, it needs linking!

-- =====================================================
-- STEP 3: Link One Assignment to One Question Paper
-- =====================================================
-- After copying the UUIDs from Steps 1 and 2:
-- 1. Uncomment the UPDATE below (remove the /* and */)
-- 2. Replace YOUR_QUESTION_PAPER_UUID with the ID from Step 1
-- 3. Replace YOUR_ASSIGNMENT_UUID with the ID from Step 2
-- 4. Run it!

/*
UPDATE assignments 
SET question_paper_id = 'YOUR_QUESTION_PAPER_UUID'
WHERE id = 'YOUR_ASSIGNMENT_UUID';
*/

-- EXAMPLE (don't run this - it's fake UUIDs):
-- UPDATE assignments 
-- SET question_paper_id = 'abc12345-1234-5678-90ab-cdef12345678'
-- WHERE id = 'xyz67890-5678-1234-cdef-abcd12345678';

-- =====================================================
-- STEP 4: Verify It Worked
-- =====================================================
-- Run this to see all assignments that ARE linked:

SELECT 
  a.id,
  a.title as assignment_title,
  a.question_paper_id,
  qp.title as question_paper_title,
  a.created_at
FROM assignments a
INNER JOIN question_papers qp ON a.question_paper_id = qp.id
WHERE a.status = 'active'
ORDER BY a.created_at DESC;

-- ✅ If you see your assignment with the question paper title, it worked!

-- =====================================================
-- BONUS: Check What Still Needs Linking
-- =====================================================
-- Run this to see which assignments still have NULL question_paper_id:

SELECT 
  id,
  title,
  assignment_type,
  'Needs linking' as status
FROM assignments
WHERE status = 'active'
  AND question_paper_id IS NULL
ORDER BY created_at DESC;

-- =====================================================
-- ADVANCED: Link Multiple Assignments at Once
-- =====================================================
-- If you want to link several assignments to the SAME question paper:
-- 1. Uncomment the UPDATE below
-- 2. Replace YOUR_QUESTION_PAPER_UUID with the ID from Step 1
-- 3. Replace the assignment UUIDs with actual IDs from Step 2
-- 4. Add or remove rows as needed
-- 5. Run it!

/*
UPDATE assignments 
SET question_paper_id = 'YOUR_QUESTION_PAPER_UUID'
WHERE id IN (
  'ASSIGNMENT_UUID_1',
  'ASSIGNMENT_UUID_2',
  'ASSIGNMENT_UUID_3'
);
*/

-- =====================================================
-- ADVANCED: Bulk Link All Custom Assignments
-- =====================================================
-- ⚠️ WARNING: This will link ALL unlinked custom assignments to ONE paper!
-- Only use if you want ALL your assignments to use the SAME question paper!

-- First, check how many would be affected:
SELECT COUNT(*) as assignments_that_will_be_linked
FROM assignments 
WHERE question_paper_id IS NULL 
  AND status = 'active'
  AND assignment_type = 'custom';

-- If the count looks right, uncomment and run this:
/*
UPDATE assignments 
SET question_paper_id = 'YOUR_QUESTION_PAPER_UUID'
WHERE question_paper_id IS NULL
  AND status = 'active'
  AND assignment_type = 'custom';
*/

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================
-- Run this to see a summary of all assignments:

SELECT 
  assignment_type,
  CASE 
    WHEN question_paper_id IS NULL THEN 'Not Linked'
    ELSE 'Linked'
  END as link_status,
  COUNT(*) as count
FROM assignments
WHERE status = 'active'
GROUP BY assignment_type, link_status
ORDER BY assignment_type, link_status;

-- Expected results:
-- assignment_type | link_status | count
-- ----------------|-------------|------
-- custom          | Linked      | 5
-- game            | Not Linked  | 3

-- Note: Game assignments don't need question_paper_id (that's normal)

-- =====================================================
-- SUCCESS!
-- =====================================================
-- You can now:
-- 1. Refresh your student portal page
-- 2. Open browser console (F12)
-- 3. Click "Start Assignment"
-- 4. Modal should open with questions! 🎉
