-- Migration: Add role column to teachers table
-- This migration adds a role column to the teachers table to support admin/teacher role-based access control

-- Add role column with default value 'teacher'
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'teacher';

-- Add a check constraint to ensure role is either 'admin' or 'teacher'
DO $$ BEGIN
  ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_role_check CHECK (role IN ('admin', 'teacher'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add is_active column if it doesn't exist
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add school_id column if it doesn't exist (for multi-school support)
-- Note: Existing teachers table has 'school_name' as text; this adds UUID support
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS school_id uuid;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_teachers_role ON public.teachers(role);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_is_active ON public.teachers(is_active);
CREATE INDEX IF NOT EXISTS idx_teachers_auth0_user_id ON public.teachers(auth0_user_id);

-- Update existing records to ensure they have a role (default to teacher)
UPDATE public.teachers
SET role = 'teacher'
WHERE role IS NULL;

-- Comments
COMMENT ON COLUMN public.teachers.role IS 'User role: admin or teacher';
COMMENT ON COLUMN public.teachers.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN public.teachers.school_id IS 'School UUID for multi-school support (complements school_name)';
