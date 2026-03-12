-- Enforce 4-state assignment lifecycle used by teacher review workflow
-- Run this once in Supabase SQL editor.

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'assignment_attempts'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.assignment_attempts DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.assignment_attempts
  ALTER COLUMN status SET DEFAULT 'not_started';

ALTER TABLE public.assignment_attempts
  ADD CONSTRAINT assignment_attempts_status_check
  CHECK (
    status IN (
      'not_started',
      'in_progress',
      'submitted',
      'completed'
    )
  );
