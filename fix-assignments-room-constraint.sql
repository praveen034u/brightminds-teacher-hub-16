-- Migration to fix room assignment issue
-- This removes the NOT NULL constraint from room_id to allow game assignments without room restrictions

-- Step 1: Remove NOT NULL constraint from room_id
ALTER TABLE assignments ALTER COLUMN room_id DROP NOT NULL;

-- Step 2: Add comment to clarify the field usage
COMMENT ON COLUMN assignments.room_id IS 'Optional room assignment. NULL means assignment is available to all students of the teacher.';

-- Step 3: Verify the change worked
-- You can run this query to check if the constraint was removed:
-- SELECT column_name, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'assignments' AND column_name = 'room_id';