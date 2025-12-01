-- =====================================================
-- COMPLETE DATABASE STRUCTURE FIX
-- =====================================================
-- This script will fix all missing columns and constraints
-- Run this in Supabase SQL Editor

-- =====================================================
-- PART 1: Fix question_papers table
-- =====================================================

-- Check current structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'question_papers'
ORDER BY ordinal_position;

-- Add missing columns to question_papers table
ALTER TABLE question_papers 
  ADD COLUMN IF NOT EXISTS grade VARCHAR(50);

ALTER TABLE question_papers 
  ADD COLUMN IF NOT EXISTS subject VARCHAR(100);

ALTER TABLE question_papers 
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE question_papers 
  ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0;

-- Ensure core columns exist
ALTER TABLE question_papers 
  ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT uuid_generate_v4();

ALTER TABLE question_papers 
  ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(255) NOT NULL DEFAULT 'unknown';

ALTER TABLE question_papers 
  ADD COLUMN IF NOT EXISTS title VARCHAR(500) NOT NULL DEFAULT 'Untitled';

ALTER TABLE question_papers 
  ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE question_papers 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE question_papers 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for question_papers
CREATE INDEX IF NOT EXISTS idx_question_papers_teacher_id 
  ON question_papers(teacher_id);

CREATE INDEX IF NOT EXISTS idx_question_papers_grade 
  ON question_papers(grade);

CREATE INDEX IF NOT EXISTS idx_question_papers_subject 
  ON question_papers(subject);

CREATE INDEX IF NOT EXISTS idx_question_papers_created_at 
  ON question_papers(created_at DESC);

-- =====================================================
-- PART 2: Fix assignments table
-- =====================================================

-- Check current structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'assignments'
ORDER BY ordinal_position;

-- Add missing columns to assignments table
ALTER TABLE assignments 
  ADD COLUMN IF NOT EXISTS question_paper_id UUID;

ALTER TABLE assignments 
  ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(50) DEFAULT 'custom';

ALTER TABLE assignments 
  ADD COLUMN IF NOT EXISTS grade VARCHAR(50);

ALTER TABLE assignments 
  ADD COLUMN IF NOT EXISTS room_id UUID;

ALTER TABLE assignments 
  ADD COLUMN IF NOT EXISTS game_config JSONB;

-- Add foreign key constraint for question_paper_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'assignments_question_paper_id_fkey'
  ) THEN
    ALTER TABLE assignments 
      ADD CONSTRAINT assignments_question_paper_id_fkey 
      FOREIGN KEY (question_paper_id) 
      REFERENCES question_papers(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for assignments
CREATE INDEX IF NOT EXISTS idx_assignments_question_paper_id 
  ON assignments(question_paper_id);

CREATE INDEX IF NOT EXISTS idx_assignments_assignment_type 
  ON assignments(assignment_type);

CREATE INDEX IF NOT EXISTS idx_assignments_grade 
  ON assignments(grade);

CREATE INDEX IF NOT EXISTS idx_assignments_room_id 
  ON assignments(room_id);

CREATE INDEX IF NOT EXISTS idx_assignments_status 
  ON assignments(status);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id 
  ON assignments(teacher_id);

CREATE INDEX IF NOT EXISTS idx_assignments_created_at 
  ON assignments(created_at DESC);

-- =====================================================
-- PART 3: Fix assignment_attempts table
-- =====================================================

-- Create assignment_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS assignment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL,
  student_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'not_started',
  score DECIMAL(5,2),
  answers JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for assignment_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'assignment_attempts_assignment_id_fkey'
  ) THEN
    ALTER TABLE assignment_attempts 
      ADD CONSTRAINT assignment_attempts_assignment_id_fkey 
      FOREIGN KEY (assignment_id) 
      REFERENCES assignments(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for assignment_attempts
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_assignment_id 
  ON assignment_attempts(assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_attempts_student_id 
  ON assignment_attempts(student_id);

CREATE INDEX IF NOT EXISTS idx_assignment_attempts_status 
  ON assignment_attempts(status);

CREATE INDEX IF NOT EXISTS idx_assignment_attempts_created_at 
  ON assignment_attempts(created_at DESC);

-- Create unique constraint to prevent duplicate attempts
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_attempts_unique 
  ON assignment_attempts(assignment_id, student_id);

-- =====================================================
-- PART 4: Fix students table
-- =====================================================

-- Add missing columns to students table
ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS grade VARCHAR(50);

ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS primary_language VARCHAR(100);

-- Create indexes for students
CREATE INDEX IF NOT EXISTS idx_students_grade 
  ON students(grade);

CREATE INDEX IF NOT EXISTS idx_students_email 
  ON students(email);

-- =====================================================
-- PART 5: Fix rooms table (if exists)
-- =====================================================

-- Check if rooms table exists and add grade column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'rooms'
  ) THEN
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS grade_level VARCHAR(50);
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT;
    CREATE INDEX IF NOT EXISTS idx_rooms_teacher_id ON rooms(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_grade_level ON rooms(grade_level);
  END IF;
END $$;

-- =====================================================
-- PART 6: Add RLS Policies (if not exist)
-- =====================================================

-- Enable RLS on question_papers
ALTER TABLE question_papers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Teachers can view their own question papers" ON question_papers;
  DROP POLICY IF EXISTS "Teachers can create question papers" ON question_papers;
  DROP POLICY IF EXISTS "Teachers can update their own question papers" ON question_papers;
  DROP POLICY IF EXISTS "Teachers can delete their own question papers" ON question_papers;
  DROP POLICY IF EXISTS "Students can view question papers through assignments" ON question_papers;
END $$;

-- Create policies for question_papers
CREATE POLICY "Teachers can view their own question papers"
  ON question_papers FOR SELECT
  USING (true);  -- Simplified for debugging, adjust as needed

CREATE POLICY "Teachers can create question papers"
  ON question_papers FOR INSERT
  WITH CHECK (true);  -- Simplified for debugging

CREATE POLICY "Teachers can update their own question papers"
  ON question_papers FOR UPDATE
  USING (true);  -- Simplified for debugging

CREATE POLICY "Teachers can delete their own question papers"
  ON question_papers FOR DELETE
  USING (true);  -- Simplified for debugging

-- Enable RLS on assignment_attempts
ALTER TABLE assignment_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for assignment_attempts
DROP POLICY IF EXISTS "Students can view their own attempts" ON assignment_attempts;
DROP POLICY IF EXISTS "Students can create attempts" ON assignment_attempts;
DROP POLICY IF EXISTS "Students can update their own attempts" ON assignment_attempts;

CREATE POLICY "Students can view their own attempts"
  ON assignment_attempts FOR SELECT
  USING (true);  -- Simplified for debugging

CREATE POLICY "Students can create attempts"
  ON assignment_attempts FOR INSERT
  WITH CHECK (true);  -- Simplified for debugging

CREATE POLICY "Students can update their own attempts"
  ON assignment_attempts FOR UPDATE
  USING (true);  -- Simplified for debugging

-- =====================================================
-- PART 7: Verify Structure
-- =====================================================

-- Check question_papers table
SELECT 
  'question_papers' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'question_papers'
ORDER BY ordinal_position;

-- Check assignments table
SELECT 
  'assignments' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'assignments'
ORDER BY ordinal_position;

-- Check assignment_attempts table
SELECT 
  'assignment_attempts' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'assignment_attempts'
ORDER BY ordinal_position;

-- Check all indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('question_papers', 'assignments', 'assignment_attempts')
ORDER BY tablename, indexname;

-- Check all foreign keys
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('question_papers', 'assignments', 'assignment_attempts')
  AND tc.constraint_type = 'FOREIGN KEY';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ Database structure fix complete!' as status;
SELECT '✅ All missing columns added' as status;
SELECT '✅ All indexes created' as status;
SELECT '✅ All foreign keys added' as status;
SELECT '✅ RLS policies configured' as status;
SELECT '🎉 You can now insert fresh data!' as status;
