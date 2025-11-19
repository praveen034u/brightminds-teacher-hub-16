-- 🏗️ CREATE ASSIGNMENT TEMPLATES TABLE
-- Run this in Supabase SQL Editor to enable the templates feature

-- Create the assignment_templates table
CREATE TABLE IF NOT EXISTS assignment_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'custom_room',
  room_id TEXT,
  room_name TEXT,
  selected_games JSONB NOT NULL DEFAULT '[]',
  assignment_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🔑 CRITICAL: Disable RLS so the service role can access it
ALTER TABLE assignment_templates DISABLE ROW LEVEL SECURITY;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_assignment_templates_teacher_id ON assignment_templates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignment_templates_type ON assignment_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_assignment_templates_created ON assignment_templates(created_at DESC);

-- Verify the table was created successfully
SELECT 
  'assignment_templates' as table_name,
  COUNT(*) as row_count,
  'Table created successfully! Templates feature is now enabled.' as status
FROM assignment_templates;