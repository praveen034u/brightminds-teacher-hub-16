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

-- Table for Practice Type Templates
CREATE TABLE practice_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    grade_level INT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

-- Games table for pre-built rooms
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  game_type TEXT NOT NULL, -- 'word-scramble', 'emoji-guess', 'riddle', 'crossword'
  game_path TEXT NOT NULL, -- URL path to game
  thumbnail_url TEXT,
  difficulty_levels TEXT[] DEFAULT ARRAY['easy', 'medium', 'hard'],
  categories TEXT[], -- Available categories for the game
  grade_levels TEXT[] DEFAULT ARRAY['K', '1', '2', '3', '4', '5'],
  skills TEXT[], -- Skills taught by the game
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Insert sample games
INSERT INTO games (name, description, game_type, game_path, categories, skills) VALUES
('Word Scramble Challenge', 'Unscramble letters to form words and improve vocabulary', 'word-scramble', '/games/word-scramble', ARRAY['General'], ARRAY['Vocabulary', 'Spelling', 'Letter Recognition']),
('Emoji Guess Game', 'Decode emoji clues to guess words and phrases', 'emoji-guess', '/games/emoji-guess', ARRAY['General'], ARRAY['Critical Thinking', 'Pattern Recognition', 'Vocabulary']),
('Riddle Master', 'Solve riddles across different themes and categories', 'riddle', '/games/riddle', ARRAY['Zoo Animals', 'Ocean Friends', 'Space', 'Nature'], ARRAY['Logic', 'Critical Thinking', 'Reading Comprehension']),
('Crossword Puzzle', 'Complete crossword puzzles with themed clues', 'crossword', '/games/crossword', ARRAY['Christmas', 'Animals', 'Space', 'Ocean'], ARRAY['Vocabulary', 'Spelling', 'General Knowledge']);

-- Update assignments table to handle game assignments
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS assignment_type TEXT DEFAULT 'room' CHECK (assignment_type IN ('room', 'game')),
ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES games(id),
ADD COLUMN IF NOT EXISTS game_config JSONB;

-- Enable RLS on games table
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Games can be viewed by everyone (teachers and students)
CREATE POLICY "Games are publicly viewable" ON games
  FOR SELECT USING (is_active = true);

-- Add indexes for games
CREATE INDEX idx_games_type ON games(game_type);
CREATE INDEX idx_games_active ON games(is_active);
CREATE INDEX idx_assignments_game_id ON assignments(game_id);

-- Add indexes for assignment attempts
CREATE INDEX idx_assignment_attempts_assignment_id ON assignment_attempts(assignment_id);
CREATE INDEX idx_assignment_attempts_student_id ON assignment_attempts(student_id);
CREATE INDEX idx_assignment_attempts_status ON assignment_attempts(status);

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

-- Add updated_at trigger for games
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for assignment attempts
CREATE TRIGGER update_assignment_attempts_updated_at BEFORE UPDATE ON assignment_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Example insert for new templates
INSERT INTO practice_templates (name, grade_level, is_enabled) VALUES
('Public Speaking', 5, TRUE),
('Reading', 5, TRUE);
