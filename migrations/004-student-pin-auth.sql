-- Migration: Student PIN-based authentication
-- Add PIN auth columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_public_id TEXT UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS pin_reset_required BOOLEAN DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Generate student_public_id for existing students that don't have one
-- Format: BM-XXXXX (5-digit random number)
UPDATE students
SET student_public_id = 'BM-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0')
WHERE student_public_id IS NULL;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_students_public_id ON students(student_public_id);

-- Create student_sessions table
CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_sessions_token ON student_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_student_sessions_student ON student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_expires ON student_sessions(expires_at);
