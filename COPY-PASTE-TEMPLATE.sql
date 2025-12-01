-- =====================================================
-- COPY-PASTE READY: Link Assignments to Question Papers
-- =====================================================
-- Follow these steps IN ORDER:

-- =====================================================
-- STEP 1: See what you have (run this first)
-- =====================================================

-- See your question papers:
SELECT 
  '📄 Question Paper UUID → ' || id as "Copy This UUID",
  title as "Question Paper Name"
FROM question_papers
ORDER BY created_at DESC;

-- See your assignments that need linking:
SELECT 
  '📝 Assignment UUID → ' || id as "Copy This UUID",
  title as "Assignment Name",
  CASE 
    WHEN question_paper_id IS NULL THEN '❌ NOT LINKED (needs fix)'
    ELSE '✅ Already linked'
  END as "Status"
FROM assignments
WHERE status = 'active'
ORDER BY created_at DESC;

-- =====================================================
-- STEP 2: Copy the UUIDs from above results
-- =====================================================
-- You'll see results like:
-- Copy This UUID                                    | Question Paper Name
-- --------------------------------------------------|--------------------
-- 📄 Question Paper UUID → abc123...                | Math Quiz

-- Copy This UUID                                    | Assignment Name
-- --------------------------------------------------|--------------------
-- 📝 Assignment UUID → xyz789...                    | Week 1 Assignment

-- =====================================================
-- STEP 3: Paste UUIDs into UPDATE statement below
-- =====================================================

-- Template (UNCOMMENT and replace the UUIDs):
/*
UPDATE assignments 
SET question_paper_id = 'YOUR_QUESTION_PAPER_UUID_HERE'
WHERE id = 'YOUR_ASSIGNMENT_UUID_HERE';
*/

-- Example with fake UUIDs (don't run this):
-- UPDATE assignments 
-- SET question_paper_id = 'abc12345-1234-1234-1234-1234567890ab'
-- WHERE id = 'xyz67890-5678-5678-5678-567890123def';

-- =====================================================
-- STEP 4: Verify it worked (run after UPDATE)
-- =====================================================
-- Replace YOUR_ASSIGNMENT_UUID_HERE with actual UUID, then uncomment:
/*
SELECT 
  a.title as "Assignment",
  qp.title as "Question Paper",
  '✅ Successfully linked!' as "Status"
FROM assignments a
INNER JOIN question_papers qp ON a.question_paper_id = qp.id
WHERE a.id = 'YOUR_ASSIGNMENT_UUID_HERE';
*/

-- Or check all linked assignments:
SELECT 
  a.title as "Assignment",
  qp.title as "Question Paper",
  '✅ Linked' as "Status"
FROM assignments a
INNER JOIN question_papers qp ON a.question_paper_id = qp.id
WHERE a.status = 'active'
ORDER BY a.created_at DESC;

-- If you see a row, it worked! 🎉

-- =====================================================
-- QUICK LINK MULTIPLE ASSIGNMENTS TO SAME PAPER
-- =====================================================
-- If you want to link MULTIPLE assignments to the SAME question paper:

-- UPDATE assignments 
-- SET question_paper_id = 'YOUR_QUESTION_PAPER_UUID_HERE'
-- WHERE id IN (
--   'ASSIGNMENT_UUID_1',
--   'ASSIGNMENT_UUID_2',
--   'ASSIGNMENT_UUID_3'
-- );

-- =====================================================
-- LINK ALL UNLINKED ASSIGNMENTS TO ONE PAPER (BULK)
-- =====================================================
-- ⚠️ WARNING: This will link ALL assignments without a question paper!
-- Only use if you want ALL assignments to use the SAME question paper!

-- UPDATE assignments 
-- SET question_paper_id = 'YOUR_QUESTION_PAPER_UUID_HERE'
-- WHERE question_paper_id IS NULL
--   AND status = 'active'
--   AND assignment_type = 'custom';

-- Check how many would be affected first:
-- SELECT COUNT(*) FROM assignments 
-- WHERE question_paper_id IS NULL 
--   AND status = 'active';
