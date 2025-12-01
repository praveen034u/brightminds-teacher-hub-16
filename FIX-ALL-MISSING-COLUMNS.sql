-- ============================================
-- FIX ALL MISSING COLUMNS IN question_papers
-- ============================================
-- This adds ALL 6 missing columns that are causing save errors

-- Add integer columns
ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;
ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0;

-- Add string columns
ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS grade VARCHAR(50);
ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS subject VARCHAR(100);

-- Add timestamp columns (CRITICAL - these were missing!)
ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- VERIFY ALL COLUMNS EXIST
-- ============================================
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'question_papers' 
AND column_name IN ('question_count', 'total_marks', 'grade', 'subject', 'created_at', 'updated_at')
ORDER BY column_name;

-- Expected: 6 rows returned
-- created_at    | timestamp with time zone | now() | YES
-- grade         | character varying        | NULL  | YES
-- question_count| integer                  | 0     | YES
-- subject       | character varying        | NULL  | YES
-- total_marks   | integer                  | 0     | YES
-- updated_at    | timestamp with time zone | now() | YES
