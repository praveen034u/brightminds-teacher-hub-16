-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.assignment_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text DEFAULT 'not_started'::text CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'submitted'::text])),
  attempts_count integer DEFAULT 0,
  score numeric,
  max_score numeric,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  submitted_at timestamp with time zone,
  submission_data jsonb,
  feedback text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  realtime_synced boolean DEFAULT true,
  CONSTRAINT assignment_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_attempts_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id),
  CONSTRAINT assignment_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.assignment_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  template_name text NOT NULL,
  template_type text NOT NULL DEFAULT 'custom_room'::text,
  room_id text,
  room_name text,
  selected_games jsonb NOT NULL DEFAULT '[]'::jsonb,
  assignment_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assignment_templates_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_templates_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id)
);
CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'archived'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  assignment_type text DEFAULT 'room'::text CHECK (assignment_type = ANY (ARRAY['room'::text, 'game'::text, 'custom'::text])),
  game_id uuid,
  game_config jsonb,
  game_type text,
  question_paper_id uuid,
  grade character varying,
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id),
  CONSTRAINT assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id),
  CONSTRAINT assignments_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id),
  CONSTRAINT assignments_question_paper_id_fkey FOREIGN KEY (question_paper_id) REFERENCES public.question_papers(id),
  CONSTRAINT fk_assignments_question_paper_id FOREIGN KEY (question_paper_id) REFERENCES public.question_papers(id)
);
CREATE TABLE public.games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  game_type text NOT NULL,
  game_path text NOT NULL,
  thumbnail_url text,
  difficulty_levels ARRAY DEFAULT ARRAY['easy'::text, 'medium'::text, 'hard'::text],
  categories ARRAY,
  grade_levels ARRAY DEFAULT ARRAY['K'::text, '1'::text, '2'::text, '3'::text, '4'::text, '5'::text],
  skills ARRAY,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT games_pkey PRIMARY KEY (id)
);
CREATE TABLE public.help_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  message text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'seen'::text, 'resolved'::text])),
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT help_requests_pkey PRIMARY KEY (id),
  CONSTRAINT help_requests_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id),
  CONSTRAINT help_requests_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id)
);
CREATE TABLE public.question_bank (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  grade text NOT NULL,
  subject text,
  topic text,
  question_type text NOT NULL CHECK (question_type = ANY (ARRAY['mcq'::text, 'true-false'::text, 'short-answer'::text, 'long-answer'::text, 'fill-blank'::text])),
  question_text text NOT NULL,
  options jsonb,
  correct_answer text,
  sample_answer text,
  marks numeric DEFAULT 1,
  difficulty text CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
  tags ARRAY,
  source text NOT NULL CHECK (source = ANY (ARRAY['ai'::text, 'manual'::text, 'ocr'::text])),
  usage_count integer DEFAULT 0,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT question_bank_pkey PRIMARY KEY (id),
  CONSTRAINT question_bank_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id)
);
CREATE TABLE public.question_papers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid,
  title text NOT NULL,
  description text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  question_count integer DEFAULT 0,
  total_marks integer DEFAULT 0,
  grade character varying,
  subject character varying,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT question_papers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.room_students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT room_students_pkey PRIMARY KEY (id),
  CONSTRAINT room_students_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id)
);
CREATE TABLE public.rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  grade_level text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rooms_pkey PRIMARY KEY (id),
  CONSTRAINT rooms_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  gender text,
  date_of_birth date,
  primary_language text DEFAULT 'English'::text,
  skills jsonb DEFAULT '[]'::jsonb,
  additional_details text,
  auth_user_id text UNIQUE,
  access_token text DEFAULT encode(gen_random_bytes(32), 'hex'::text) UNIQUE,
  enrollment_code text UNIQUE,
  invitation_status text DEFAULT 'pending'::text CHECK (invitation_status = ANY (ARRAY['pending'::text, 'completed'::text])),
  invited_at timestamp with time zone,
  enrolled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  grade text,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id)
);
CREATE TABLE public.teachers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth0_user_id text UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  school_name text,
  grades_taught ARRAY,
  subjects ARRAY,
  preferred_language text DEFAULT 'English'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teachers_pkey PRIMARY KEY (id)
);