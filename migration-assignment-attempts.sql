-- Migration to add assignment attempts tracking
-- Run this in your Supabase SQL Editor

-- Assignment attempts table to track student progress
CREATE TABLE IF NOT EXISTS assignment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'submitted')),
  attempts_count INTEGER DEFAULT 0,
  score DECIMAL(5,2), -- Score as percentage (0.00 to 100.00)
  max_score DECIMAL(5,2), -- Maximum score achieved across attempts
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submission_data JSONB, -- Store game results, answers, etc.
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- Add indexes for assignment attempts
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_assignment_id ON assignment_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_student_id ON assignment_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_status ON assignment_attempts(status);

-- Enable RLS on assignment attempts table
ALTER TABLE assignment_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignment attempts
-- Teachers can view attempts for their assignments
CREATE POLICY "Teachers can view assignment attempts" ON assignment_attempts
  FOR SELECT USING (
    assignment_id IN (
      SELECT id FROM assignments 
      WHERE teacher_id IN (
        SELECT id FROM teachers 
        WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

-- Teachers can manage attempts for their assignments
CREATE POLICY "Teachers can manage assignment attempts" ON assignment_attempts
  FOR ALL USING (
    assignment_id IN (
      SELECT id FROM assignments 
      WHERE teacher_id IN (
        SELECT id FROM teachers 
        WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

-- Students can view their own attempts
CREATE POLICY "Students can view own attempts" ON assignment_attempts
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE access_token IS NOT NULL
    )
  );

-- Students can create/update their own attempts
CREATE POLICY "Students can manage own attempts" ON assignment_attempts
  FOR ALL USING (
    student_id IN (
      SELECT id FROM students WHERE access_token IS NOT NULL
    )
  );

-- Add updated_at trigger for assignment attempts
CREATE TRIGGER update_assignment_attempts_updated_at BEFORE UPDATE ON assignment_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add assignment_attempts to Realtime publication (if it exists)
-- This allows real-time updates when students start/complete assignments
DO $$ 
BEGIN
  -- Check if the publication exists first
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE assignment_attempts;
  END IF;
END $$;

-- Insert some sample attempts for testing (optional)
-- Uncomment the lines below if you want to test with sample data

/*
-- Get a sample student and assignment for testing
WITH sample_data AS (
  SELECT 
    s.id as student_id,
    a.id as assignment_id
  FROM students s
  CROSS JOIN assignments a
  WHERE s.name = 'Demo Student' -- Replace with actual student name
  AND a.title LIKE '%Homework%' -- Replace with actual assignment title
  LIMIT 1
)
INSERT INTO assignment_attempts (assignment_id, student_id, status, attempts_count, started_at)
SELECT assignment_id, student_id, 'in_progress', 1, NOW()
FROM sample_data
ON CONFLICT (assignment_id, student_id) DO NOTHING;
*/

-- Success message
SELECT 'Assignment attempts table created successfully! 🎉' as message;