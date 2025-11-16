-- Migration: Add email and access_token to students table
-- Run this in your Supabase SQL Editor

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='students' AND column_name='email') THEN
    ALTER TABLE students ADD COLUMN email TEXT;
  END IF;
END $$;

-- Add access_token column with unique constraint and default value
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='students' AND column_name='access_token') THEN
    ALTER TABLE students ADD COLUMN access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');
  END IF;
END $$;

-- Generate access tokens for existing students that don't have one
UPDATE students 
SET access_token = encode(gen_random_bytes(32), 'hex')
WHERE access_token IS NULL OR access_token = '';

-- Create index on access_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_access_token ON students(access_token);

-- Student Portal RLS Policies (Allow students to access their own data via access_token)

-- Drop existing student portal policies if they exist
DROP POLICY IF EXISTS "Students can view own profile via token" ON students;
DROP POLICY IF EXISTS "Students can view own room assignments" ON room_students;
DROP POLICY IF EXISTS "Students can view assigned rooms" ON rooms;
DROP POLICY IF EXISTS "Students can view room assignments" ON assignments;
DROP POLICY IF EXISTS "Students can create help requests" ON help_requests;
DROP POLICY IF EXISTS "Students can view own help requests" ON help_requests;

-- Students can view their own profile using access token
CREATE POLICY "Students can view own profile via token" ON students
  FOR SELECT USING (
    access_token IS NOT NULL 
    AND access_token != ''
  );

-- Students can view room_students for their rooms
CREATE POLICY "Students can view own room assignments" ON room_students
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE access_token IS NOT NULL
    )
  );

-- Students can view their assigned rooms
CREATE POLICY "Students can view assigned rooms" ON rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM room_students 
      WHERE student_id IN (
        SELECT id FROM students WHERE access_token IS NOT NULL
      )
    )
  );

-- Students can view assignments for their rooms
CREATE POLICY "Students can view room assignments" ON assignments
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM room_students 
      WHERE student_id IN (
        SELECT id FROM students WHERE access_token IS NOT NULL
      )
    )
  );

-- Students can create help requests
CREATE POLICY "Students can create help requests" ON help_requests
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE access_token IS NOT NULL
    )
  );

-- Students can view their own help requests
CREATE POLICY "Students can view own help requests" ON help_requests
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students WHERE access_token IS NOT NULL
    )
  );

-- In Supabase Dashboard > SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_students;
ALTER PUBLICATION supabase_realtime ADD TABLE students;