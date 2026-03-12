-- Create a dedicated per-question response table for assignment submissions.
-- Run this once in Supabase SQL editor before using teacher review.

CREATE TABLE IF NOT EXISTS public.assignment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  question_id TEXT,
  question_index INTEGER NOT NULL,
  question_text TEXT,
  question_type TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  student_answer TEXT,
  correct_answer TEXT,
  is_correct BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, student_id, question_index)
);

CREATE INDEX IF NOT EXISTS idx_assignment_responses_assignment_student
  ON public.assignment_responses (assignment_id, student_id);

CREATE INDEX IF NOT EXISTS idx_assignment_responses_student
  ON public.assignment_responses (student_id);

CREATE INDEX IF NOT EXISTS idx_assignment_responses_submitted_at
  ON public.assignment_responses (submitted_at);
