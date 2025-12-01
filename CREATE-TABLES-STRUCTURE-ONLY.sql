-- =====================================================
-- DATABASE STRUCTURE FIX - COLUMNS AND CONSTRAINTS ONLY
-- =====================================================
-- This script ONLY fixes table structure
-- NO data insertion or updates
-- All data will come from your application

-- =====================================================
-- Enable UUID extension (if not already enabled)
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FIX: question_papers table structure
-- =====================================================

-- Add missing columns
ALTER TABLE question_papers 
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS title VARCHAR(500),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS grade VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subject VARCHAR(100),
  ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add primary key if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'question_papers' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE question_papers ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_papers_teacher_id ON question_papers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_question_papers_grade ON question_papers(grade);
CREATE INDEX IF NOT EXISTS idx_question_papers_subject ON question_papers(subject);
CREATE INDEX IF NOT EXISTS idx_question_papers_created_at ON question_papers(created_at DESC);

-- =====================================================
-- FIX: assignments table structure
-- =====================================================

-- Add missing columns
ALTER TABLE assignments 
  ADD COLUMN IF NOT EXISTS question_paper_id UUID,
  ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(50) DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS grade VARCHAR(50),
  ADD COLUMN IF NOT EXISTS room_id UUID,
  ADD COLUMN IF NOT EXISTS game_config JSONB,
  ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS title VARCHAR(500),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add foreign key constraint for question_paper_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_assignments_question_paper_id' AND table_name = 'assignments'
  ) THEN
    ALTER TABLE assignments 
      ADD CONSTRAINT fk_assignments_question_paper_id 
      FOREIGN KEY (question_paper_id) 
      REFERENCES question_papers(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_question_paper_id ON assignments(question_paper_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assignment_type ON assignments(assignment_type);
CREATE INDEX IF NOT EXISTS idx_assignments_grade ON assignments(grade);
CREATE INDEX IF NOT EXISTS idx_assignments_room_id ON assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_at ON assignments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- =====================================================
-- FIX: assignment_attempts table structure
-- =====================================================

-- Create table if it doesn't exist
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

-- Add foreign key for assignment_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_assignment_attempts_assignment_id' AND table_name = 'assignment_attempts'
  ) THEN
    ALTER TABLE assignment_attempts 
      ADD CONSTRAINT fk_assignment_attempts_assignment_id 
      FOREIGN KEY (assignment_id) 
      REFERENCES assignments(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_assignment_id ON assignment_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_student_id ON assignment_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_status ON assignment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_created_at ON assignment_attempts(created_at DESC);

-- Create unique constraint (one attempt per student per assignment)
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_attempts_unique 
  ON assignment_attempts(assignment_id, student_id);

-- =====================================================
-- FIX: students table structure
-- =====================================================

-- Add missing columns to students
ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS grade VARCHAR(50),
  ADD COLUMN IF NOT EXISTS primary_language VARCHAR(100);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- =====================================================
-- FIX: rooms table structure (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'rooms'
  ) THEN
    ALTER TABLE rooms 
      ADD COLUMN IF NOT EXISTS grade_level VARCHAR(50),
      ADD COLUMN IF NOT EXISTS description TEXT;
    
    CREATE INDEX IF NOT EXISTS idx_rooms_teacher_id ON rooms(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_grade_level ON rooms(grade_level);
  END IF;
END $$;

-- =====================================================
-- FIX: games table structure (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'games'
  ) THEN
    ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS game_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS difficulty_levels JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    
    CREATE INDEX IF NOT EXISTS idx_games_game_type ON games(game_type);
    CREATE INDEX IF NOT EXISTS idx_games_is_active ON games(is_active);
  END IF;
END $$;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tables (permissive for development)
ALTER TABLE question_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for development" ON question_papers;
DROP POLICY IF EXISTS "Enable all access for development" ON assignments;
DROP POLICY IF EXISTS "Enable all access for development" ON assignment_attempts;

-- Create permissive policies for development
CREATE POLICY "Enable all access for development"
  ON question_papers FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for development"
  ON assignments FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for development"
  ON assignment_attempts FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check question_papers structure
SELECT 
  column_name, 
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'question_papers'
ORDER BY ordinal_position;

-- Check assignments structure
SELECT 
  column_name, 
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'assignments'
ORDER BY ordinal_position;

-- Check assignment_attempts structure
SELECT 
  column_name, 
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'assignment_attempts'
ORDER BY ordinal_position;

-- Check foreign keys
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
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- Check indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('question_papers', 'assignments', 'assignment_attempts')
ORDER BY tablename, indexname;

-- Final success message
SELECT 
  '✅ Database structure is ready!' as status,
  'All columns, constraints, and indexes created' as details,
  'You can now create data through your application' as next_step;
