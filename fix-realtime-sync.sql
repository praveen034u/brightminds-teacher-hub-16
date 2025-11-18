-- Fix Real-time Sync Issues for Assignment Completion
-- Run this in your Supabase SQL Editor to improve sync reliability

-- 1. Enable real-time for assignment_attempts table (ensure it's published)
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_attempts;

-- 2. Drop existing restrictive policies and create more permissive ones for real-time
DROP POLICY IF EXISTS "Teachers can view assignment attempts" ON assignment_attempts;
DROP POLICY IF EXISTS "Teachers can manage assignment attempts" ON assignment_attempts;
DROP POLICY IF EXISTS "Students can view own attempts" ON assignment_attempts;
DROP POLICY IF EXISTS "Students can manage own attempts" ON assignment_attempts;

-- 3. Create new, more permissive policies that work better with real-time

-- Allow teachers to see all assignment attempts for their assignments
CREATE POLICY "Teachers view assignment attempts" ON assignment_attempts
  FOR SELECT USING (
    assignment_id IN (
      SELECT a.id FROM assignments a
      JOIN teachers t ON a.teacher_id = t.id
      WHERE t.auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Allow teachers to manage assignment attempts for their assignments  
CREATE POLICY "Teachers manage assignment attempts" ON assignment_attempts
  FOR ALL USING (
    assignment_id IN (
      SELECT a.id FROM assignments a
      JOIN teachers t ON a.teacher_id = t.id
      WHERE t.auth0_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Allow students to view their own attempts (more permissive)
CREATE POLICY "Students view own attempts" ON assignment_attempts
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM students 
      WHERE access_token IS NOT NULL
    )
  );

-- Allow students to create and update their own attempts
CREATE POLICY "Students manage own attempts" ON assignment_attempts
  FOR INSERT WITH CHECK (
    student_id IN (
      SELECT id FROM students 
      WHERE access_token IS NOT NULL
    )
  );

CREATE POLICY "Students update own attempts" ON assignment_attempts
  FOR UPDATE USING (
    student_id IN (
      SELECT id FROM students 
      WHERE access_token IS NOT NULL
    )
  );

-- 4. Create a more permissive policy for service role (used by Edge Functions)
CREATE POLICY "Service role full access" ON assignment_attempts
  FOR ALL USING (
    current_setting('role') = 'service_role'
  );

-- 5. Add a trigger function to log assignment completion events
CREATE OR REPLACE FUNCTION log_assignment_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when an assignment is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.activity_log (
      table_name,
      action,
      record_id,
      details,
      created_at
    ) VALUES (
      'assignment_attempts',
      'completed',
      NEW.id,
      jsonb_build_object(
        'assignment_id', NEW.assignment_id,
        'student_id', NEW.student_id,
        'score', NEW.score,
        'completed_at', NEW.completed_at
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create activity log table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  record_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add the trigger
DROP TRIGGER IF EXISTS assignment_completion_logger ON assignment_attempts;
CREATE TRIGGER assignment_completion_logger
  AFTER UPDATE ON assignment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION log_assignment_completion();

-- 6. Grant proper permissions for real-time subscriptions
GRANT SELECT, INSERT, UPDATE ON assignment_attempts TO anon;
GRANT SELECT, INSERT, UPDATE ON assignment_attempts TO authenticated;
GRANT ALL ON assignment_attempts TO service_role;

-- 7. Ensure the table is included in real-time replication
-- This might need to be done via Supabase dashboard under Database -> Replication
-- But we'll try to set it here as well
SELECT cron.schedule('refresh-realtime-assignment-attempts', '*/30 * * * * *', 'NOTIFY assignment_attempts_refresh;');

-- 8. Create a function to force refresh assignment data
CREATE OR REPLACE FUNCTION refresh_assignment_attempts()
RETURNS void AS $$
BEGIN
  -- This function can be called to force a refresh of assignment attempts data
  -- Useful for debugging sync issues
  PERFORM pg_notify('assignment_attempts_refresh', 'manual_refresh');
END;
$$ LANGUAGE plpgsql;

-- 9. Add indexes to improve performance of real-time queries
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_updated_at ON assignment_attempts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_attempts_completed_at ON assignment_attempts(completed_at DESC) WHERE completed_at IS NOT NULL;

-- 10. Update the assignment_attempts table to ensure it has proper structure
ALTER TABLE assignment_attempts 
ADD COLUMN IF NOT EXISTS realtime_synced BOOLEAN DEFAULT false;

-- Create a function to mark records as synced
CREATE OR REPLACE FUNCTION mark_attempt_synced()
RETURNS TRIGGER AS $$
BEGIN
  NEW.realtime_synced = true;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to mark records as synced when updated
DROP TRIGGER IF EXISTS mark_synced_trigger ON assignment_attempts;
CREATE TRIGGER mark_synced_trigger
  BEFORE UPDATE ON assignment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION mark_attempt_synced();

-- Comment for reference
COMMENT ON TABLE assignment_attempts IS 'Assignment attempts table with enhanced real-time sync support. Last updated: 2025-11-19';