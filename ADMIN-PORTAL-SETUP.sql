-- ============================================================================
-- BrightMinds Admin Portal - Quick Setup Script
-- ============================================================================
-- This script combines all necessary database changes for the Admin Portal
-- Run this in your Supabase SQL Editor to set up everything at once
-- Works with existing 'teachers' table structure
-- ============================================================================

-- ============================================================================
-- PART 1: Add Role and School Support to Teachers Table
-- ============================================================================

-- Add role column with default value 'teacher'
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'teacher';

-- Add is_active column for account management
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add school_id column for multi-school support
-- Note: This replaces the existing 'school_name' text field with a UUID reference
-- The existing 'school_name' field is kept for backward compatibility
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS school_id uuid;

-- Add check constraint to ensure role is either 'admin' or 'teacher'
DO $$ BEGIN
  ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_role_check CHECK (role IN ('admin', 'teacher'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_teachers_role ON public.teachers(role);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_is_active ON public.teachers(is_active);
CREATE INDEX IF NOT EXISTS idx_teachers_auth0_user_id ON public.teachers(auth0_user_id);

-- Update existing records to ensure they have a role (all existing are teachers)
UPDATE public.teachers
SET role = 'teacher'
WHERE role IS NULL;

-- Add comments
COMMENT ON COLUMN public.teachers.role IS 'User role: admin or teacher';
COMMENT ON COLUMN public.teachers.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN public.teachers.school_id IS 'School UUID for multi-school support';

-- ============================================================================
-- PART 2: Create Announcements Table
-- ============================================================================

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'banner',
  audience text NOT NULL DEFAULT 'all',
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add check constraints
DO $$ BEGIN
  ALTER TABLE announcements
  ADD CONSTRAINT announcements_type_check CHECK (type IN ('banner', 'notification', 'alert'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE announcements
  ADD CONSTRAINT announcements_audience_check CHECK (audience IN ('all', 'teachers', 'students'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_announcements_school_id ON announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(audience);
CREATE INDEX IF NOT EXISTS idx_announcements_start_at ON announcements(start_at);
CREATE INDEX IF NOT EXISTS idx_announcements_end_at ON announcements(end_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_announcements_active_school_audience 
ON announcements(school_id, is_active, audience, start_at DESC);

-- Add comments
COMMENT ON TABLE announcements IS 'Admin-created announcements and newsletters';
COMMENT ON COLUMN announcements.type IS 'Type of announcement: banner, notification, or alert';
COMMENT ON COLUMN announcements.audience IS 'Target audience: all, teachers, or students';
COMMENT ON COLUMN announcements.start_at IS 'When the announcement becomes visible';
COMMENT ON COLUMN announcements.end_at IS 'When the announcement expires (optional)';
COMMENT ON COLUMN announcements.is_active IS 'Whether the announcement is currently active';

-- ============================================================================
-- PART 3: Row Level Security (RLS) for Announcements
-- ============================================================================

-- Enable RLS on announcements table
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS announcements_admin_all ON public.announcements;
DROP POLICY IF EXISTS announcements_read_active ON public.announcements;

-- Policy: Admins can do everything with announcements in their school
CREATE POLICY announcements_admin_all 
ON public.announcements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.auth0_user_id = (SELECT auth0_user_id FROM public.teachers WHERE id = auth.uid() LIMIT 1)
    AND teachers.role = 'admin'
    AND teachers.school_id = announcements.school_id
  )
);

-- Policy: Teachers can read active announcements for their school
CREATE POLICY announcements_read_active 
ON public.announcements
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    audience = 'all' 
    OR (audience = 'teachers' AND EXISTS (
      SELECT 1 FROM public.teachers
      WHERE teachers.auth0_user_id = (SELECT auth0_user_id FROM public.teachers WHERE id = auth.uid() LIMIT 1)
      AND teachers.role IN ('teacher', 'admin')
      AND teachers.school_id = announcements.school_id
    ))
    OR (audience = 'students' AND EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = auth.uid()
    ))
  )
  AND start_at <= now()
  AND (end_at IS NULL OR end_at >= now())
);

-- ============================================================================
-- PART 4: Sample Data (Optional - Remove for Production)
-- ============================================================================

-- Uncomment below to create a sample admin user
-- Note: Replace 'your-auth0-user-id' with an actual Auth0 user ID

/*
-- Set an existing teacher as admin
UPDATE public.teachers
SET role = 'admin',
    school_id = gen_random_uuid() -- or use an existing school_id
WHERE auth0_user_id = 'your-auth0-user-id';

-- Create a sample announcement
INSERT INTO public.announcements (
  school_id,
  title,
  body,
  type,
  audience,
  created_by,
  is_active
)
SELECT
  school_id,
  'Welcome to BrightMinds!',
  'We are excited to have you here. Check out the new features in the admin portal.',
  'banner',
  'all',
  id,
  true
FROM public.teachers
WHERE auth0_user_id = 'your-auth0-user-id'
LIMIT 1;
*/

-- ============================================================================
-- PART 5: Verification Queries
-- ============================================================================

-- Run these queries to verify the setup:

-- 1. Check teachers table structure
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'teachers'
-- AND column_name IN ('role', 'is_active', 'school_id');

-- 2. Check announcements table exists
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_name = 'announcements';

-- 3. Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'announcements';

-- 4. Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('teachers', 'announcements')
-- AND indexname LIKE 'idx_%';

-- ============================================================================
-- Setup Complete! 🎉
-- ============================================================================
-- Next steps:
-- 1. Configure Auth0 Action to add role claim
-- 2. Set user roles in Auth0 app_metadata
-- 3. Deploy Supabase Edge Functions
-- 4. Test the admin portal at /admin
-- ============================================================================
