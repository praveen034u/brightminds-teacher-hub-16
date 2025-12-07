-- Migration: Create announcements table
-- This migration creates the announcements table for admin-created announcements/newsletters

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

-- Add check constraint for type
ALTER TABLE announcements
ADD CONSTRAINT announcements_type_check CHECK (type IN ('banner', 'notification', 'alert'));

-- Add check constraint for audience
ALTER TABLE announcements
ADD CONSTRAINT announcements_audience_check CHECK (audience IN ('all', 'teachers', 'students'));

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

-- Add foreign key constraint (if profiles table exists)
-- ALTER TABLE announcements
-- ADD CONSTRAINT announcements_created_by_fkey 
-- FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy: Admins can do everything with announcements in their school
CREATE POLICY announcements_admin_all 
ON announcements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.school_id = announcements.school_id
  )
);

-- Policy: Teachers and students can read active announcements
CREATE POLICY announcements_read_active 
ON announcements
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    audience = 'all' 
    OR (audience = 'teachers' AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    ))
    OR (audience = 'students' AND EXISTS (
      SELECT 1 FROM students
      WHERE students.id = auth.uid()
    ))
  )
  AND start_at <= now()
  AND (end_at IS NULL OR end_at >= now())
);

-- Comments
COMMENT ON TABLE announcements IS 'Admin-created announcements and newsletters';
COMMENT ON COLUMN announcements.type IS 'Type of announcement: banner, notification, or alert';
COMMENT ON COLUMN announcements.audience IS 'Target audience: all, teachers, or students';
COMMENT ON COLUMN announcements.start_at IS 'When the announcement becomes visible';
COMMENT ON COLUMN announcements.end_at IS 'When the announcement expires (optional)';
COMMENT ON COLUMN announcements.is_active IS 'Whether the announcement is currently active';
