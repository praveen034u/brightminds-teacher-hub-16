-- Migration: Enable Realtime for Student Portal
-- Run this in your Supabase SQL Editor

-- Enable Realtime for assignments table
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;

-- Enable Realtime for rooms table (in case student needs room updates too)
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- Enable Realtime for room_students table (for room assignment changes)
ALTER PUBLICATION supabase_realtime ADD TABLE room_students;

-- Enable Realtime for students table (for student profile updates)
ALTER PUBLICATION supabase_realtime ADD TABLE students;

-- Verify Realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
