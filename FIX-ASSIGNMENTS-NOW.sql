-- ═══════════════════════════════════════════════════════════════
-- COPY AND RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: Check if columns exist
-- ═══════════════════════════════════════════════════════════════
SELECT 
  'Column Check' as step,
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'assignments' 
AND column_name IN ('question_paper_id', 'assignment_type', 'grade')
ORDER BY column_name;

-- If no results above, run this migration:
-- ALTER TABLE assignments ADD COLUMN IF NOT EXISTS question_paper_id UUID REFERENCES question_papers(id);
-- ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(50);
-- ALTER TABLE assignments ADD COLUMN IF NOT EXISTS grade VARCHAR(10);


-- STEP 2: See which assignments are BROKEN (no question_paper_id)
-- ═══════════════════════════════════════════════════════════════
SELECT 
  '❌ BROKEN - No question_paper_id' as status,
  id,
  title,
  room_id,
  status,
  created_at
FROM assignments
WHERE question_paper_id IS NULL
AND status = 'active'
ORDER BY created_at DESC;


-- STEP 3: See which assignments are WORKING (have question_paper_id)
-- ═══════════════════════════════════════════════════════════════
SELECT 
  '✅ WORKING - Has question_paper_id' as status,
  a.id,
  a.title,
  a.question_paper_id,
  qp.title as paper_title,
  jsonb_array_length(qp.questions) as question_count
FROM assignments a
JOIN question_papers qp ON qp.id = a.question_paper_id
WHERE a.status = 'active'
ORDER BY a.created_at DESC;


-- STEP 4: See all available question papers
-- ═══════════════════════════════════════════════════════════════
SELECT 
  'Available Question Papers' as info,
  id,
  title,
  description,
  jsonb_array_length(questions) as question_count,
  created_at
FROM question_papers
ORDER BY created_at DESC
LIMIT 10;


-- STEP 5: FIX IT - Link assignments to question papers
-- ═══════════════════════════════════════════════════════════════
-- COPY A question_paper_id FROM STEP 4 ABOVE
-- THEN RUN THIS (replace the IDs):

/*
UPDATE assignments
SET 
  question_paper_id = 'PASTE-QUESTION-PAPER-ID-HERE',
  assignment_type = 'custom',
  grade = '10'
WHERE id = 'PASTE-ASSIGNMENT-ID-HERE';
*/


-- STEP 6: VERIFY IT WORKED
-- ═══════════════════════════════════════════════════════════════
-- Replace <assignment-id> with your assignment ID and run:

/*
SELECT 
  'Verification' as step,
  a.id as assignment_id,
  a.title as assignment_title,
  a.question_paper_id,
  qp.title as question_paper_title,
  jsonb_array_length(qp.questions) as question_count,
  CASE 
    WHEN a.question_paper_id IS NOT NULL THEN '✅ FIXED! Will open modal'
    ELSE '❌ STILL BROKEN - question_paper_id is NULL'
  END as status
FROM assignments a
LEFT JOIN question_papers qp ON qp.id = a.question_paper_id
WHERE a.id = 'YOUR-ASSIGNMENT-ID';
*/


-- OPTIONAL: BULK FIX - Link ALL active assignments to one question paper
-- ═══════════════════════════════════════════════════════════════
-- USE WITH CAUTION! This updates ALL assignments without question_paper_id

/*
UPDATE assignments
SET 
  question_paper_id = 'YOUR-DEFAULT-QUESTION-PAPER-ID',
  assignment_type = 'custom'
WHERE question_paper_id IS NULL
AND status = 'active';
*/


-- FINAL CHECK: Count fixed vs broken assignments
-- ═══════════════════════════════════════════════════════════════
SELECT 
  CASE 
    WHEN question_paper_id IS NOT NULL THEN '✅ Has Question Paper'
    ELSE '❌ Missing Question Paper'
  END as status,
  COUNT(*) as count
FROM assignments
WHERE status = 'active'
GROUP BY (question_paper_id IS NOT NULL)
ORDER BY count DESC;


-- ═══════════════════════════════════════════════════════════════
-- AFTER RUNNING THIS SCRIPT:
-- 1. Look at the results
-- 2. If assignments show "❌ BROKEN", copy a question_paper_id from STEP 4
-- 3. Uncomment and run the UPDATE in STEP 5
-- 4. Verify with STEP 6
-- 5. Go back to browser and test!
-- ═══════════════════════════════════════════════════════════════
