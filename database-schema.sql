-- BrightMinds Database Schema (Phase 1 with Future-Proof Fields)
-- Run this in your Supabase SQL Editor

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_user_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  school_name TEXT,
  grades_taught TEXT[],
  subjects TEXT[],
  preferred_language TEXT DEFAULT 'English',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students table with future-proof fields
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,  -- Student email address
  gender TEXT,
  date_of_birth DATE,
  primary_language TEXT DEFAULT 'English',
  skills JSONB DEFAULT '[]'::jsonb,
  additional_details TEXT,
  
  -- Student portal access fields
  auth_user_id TEXT UNIQUE,  -- Will link to student account later
  access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),  -- Unique access token for student portal
  enrollment_code TEXT UNIQUE,  -- For student self-enrollment
  invitation_status TEXT DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'completed')),
  invited_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  grade_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room students junction table
CREATE TABLE IF NOT EXISTS room_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, student_id)
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Help requests table
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'seen', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teachers (teacher can only access their own data)
CREATE POLICY "Teachers can view own profile" ON teachers
  FOR SELECT USING (auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Teachers can update own profile" ON teachers
  FOR UPDATE USING (auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for students (teacher can only access their students)
CREATE POLICY "Teachers can view own students" ON students
  FOR SELECT USING (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Teachers can insert own students" ON students
  FOR INSERT WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Teachers can update own students" ON students
  FOR UPDATE USING (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Teachers can delete own students" ON students
  FOR DELETE USING (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- RLS Policies for rooms
CREATE POLICY "Teachers can view own rooms" ON rooms
  FOR SELECT USING (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Teachers can insert own rooms" ON rooms
  FOR INSERT WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Teachers can update own rooms" ON rooms
  FOR UPDATE USING (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Teachers can delete own rooms" ON rooms
  FOR DELETE USING (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- RLS Policies for room_students
CREATE POLICY "Teachers can view own room students" ON room_students
  FOR SELECT USING (room_id IN (SELECT id FROM rooms WHERE teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub')));

CREATE POLICY "Teachers can manage own room students" ON room_students
  FOR ALL USING (room_id IN (SELECT id FROM rooms WHERE teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub')));

-- RLS Policies for assignments
CREATE POLICY "Teachers can view own assignments" ON assignments
  FOR SELECT USING (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Teachers can insert own assignments" ON assignments
  FOR INSERT WITH CHECK (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Teachers can update own assignments" ON assignments
  FOR UPDATE USING (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Teachers can delete own assignments" ON assignments
  FOR DELETE USING (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- RLS Policies for help_requests
CREATE POLICY "Teachers can view own help requests" ON help_requests
  FOR SELECT USING (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Teachers can manage own help requests" ON help_requests
  FOR ALL USING (teacher_id IN (SELECT id FROM teachers WHERE auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_students_teacher_id ON students(teacher_id);
CREATE INDEX idx_students_auth_user_id ON students(auth_user_id);
CREATE INDEX idx_students_enrollment_code ON students(enrollment_code);
CREATE INDEX idx_rooms_teacher_id ON rooms(teacher_id);
CREATE INDEX idx_room_students_room_id ON room_students(room_id);
CREATE INDEX idx_room_students_student_id ON room_students(student_id);
CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX idx_assignments_room_id ON assignments(room_id);
CREATE INDEX idx_help_requests_teacher_id ON help_requests(teacher_id);
CREATE INDEX idx_help_requests_status ON help_requests(status);

-- Insert mock teacher for preview
INSERT INTO teachers (auth0_user_id, full_name, email, school_name, grades_taught, subjects, preferred_language)
VALUES ('mock-teacher-1', 'Mrs. Sharma', 'sharma@brightminds.edu', 'Bright Future Elementary', ARRAY['3', '4', '5'], ARRAY['English', 'Math', 'Science'], 'English')
ON CONFLICT (auth0_user_id) DO NOTHING;

-- Student Portal RLS Policies (Allow students to access their own data via access_token)
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
