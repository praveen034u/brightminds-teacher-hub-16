-- Migration: Add question_paper_id and grade to assignments table
-- This allows assignments to be linked to question papers

-- Add question_paper_id column (foreign key to question_papers table)
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS question_paper_id UUID REFERENCES question_papers(id) ON DELETE SET NULL;

-- Add grade column for assignment grade level
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS grade VARCHAR(10);

-- Add assignment_type column if it doesn't exist
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(50) DEFAULT 'custom';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assignments_question_paper_id ON assignments(question_paper_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assignment_type ON assignments(assignment_type);

-- Add comment for documentation
COMMENT ON COLUMN assignments.question_paper_id IS 'Reference to the question paper used in this assignment';
COMMENT ON COLUMN assignments.grade IS 'Grade level for this assignment (e.g., "5", "10", "12")';
COMMENT ON COLUMN assignments.assignment_type IS 'Type of assignment: custom (with question paper), game, or other';
