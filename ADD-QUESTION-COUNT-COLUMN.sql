-- Add missing columns to question_papers table
-- Run this in Supabase SQL Editor

-- Add question_count column
ALTER TABLE question_papers 
ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;

-- Add total_marks column
ALTER TABLE question_papers 
ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0;

-- Add grade column if missing
ALTER TABLE question_papers 
ADD COLUMN IF NOT EXISTS grade VARCHAR(50);

-- Add subject column if missing
ALTER TABLE question_papers 
ADD COLUMN IF NOT EXISTS subject VARCHAR(100);

-- Update existing records to calculate question_count from questions JSONB array
UPDATE question_papers
SET question_count = jsonb_array_length(questions)
WHERE question_count IS NULL OR question_count = 0;

-- Verify the columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'question_papers'
AND column_name IN ('question_count', 'total_marks', 'grade', 'subject')
ORDER BY column_name;

-- Show current table structure
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'question_papers'
ORDER BY ordinal_position;
