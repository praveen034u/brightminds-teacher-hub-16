-- Migration: Question Papers Table
-- This table stores question papers created by teachers

-- Create question_papers table
CREATE TABLE IF NOT EXISTS question_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    question_count INTEGER DEFAULT 0,
    total_marks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on teacher_id for faster queries
CREATE INDEX IF NOT EXISTS idx_question_papers_teacher_id ON question_papers(teacher_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_question_papers_created_at ON question_papers(created_at DESC);

-- Enable Row Level Security
ALTER TABLE question_papers ENABLE ROW LEVEL SECURITY;

-- Create policy: Teachers can only see their own question papers
CREATE POLICY question_papers_teacher_select ON question_papers
    FOR SELECT
    USING (teacher_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create policy: Teachers can insert their own question papers
CREATE POLICY question_papers_teacher_insert ON question_papers
    FOR INSERT
    WITH CHECK (teacher_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create policy: Teachers can update their own question papers
CREATE POLICY question_papers_teacher_update ON question_papers
    FOR UPDATE
    USING (teacher_id = current_setting('request.jwt.claims', true)::json->>'sub')
    WITH CHECK (teacher_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create policy: Teachers can delete their own question papers
CREATE POLICY question_papers_teacher_delete ON question_papers
    FOR DELETE
    USING (teacher_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_question_papers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_question_papers_updated_at
    BEFORE UPDATE ON question_papers
    FOR EACH ROW
    EXECUTE FUNCTION update_question_papers_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON question_papers TO authenticated;
GRANT USAGE ON SEQUENCE question_papers_id_seq TO authenticated;

-- Add comment
COMMENT ON TABLE question_papers IS 'Stores question papers created by teachers with support for multiple question types and AI generation';
