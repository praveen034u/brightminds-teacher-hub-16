-- Migration: Add role column to profiles table
-- This migration adds a role column to the profiles table to support admin/teacher role-based access control

-- Add role column with default value 'teacher'
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'teacher';

-- Add a check constraint to ensure role is either 'admin' or 'teacher'
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'teacher'));

-- Add is_active column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add school_id column if it doesn't exist (for multi-school support)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS school_id uuid;

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Create index on school_id for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);

-- Update existing records to ensure they have a role
UPDATE profiles
SET role = 'teacher'
WHERE role IS NULL;

-- Comment
COMMENT ON COLUMN profiles.role IS 'User role: admin or teacher';
COMMENT ON COLUMN profiles.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN profiles.school_id IS 'School ID for multi-school support';
