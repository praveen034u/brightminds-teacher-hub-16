-- Assignment Completion Sync Test Guide
-- Use these queries to test and debug sync issues

-- 1. Check if real-time is enabled for assignment_attempts
SELECT schemaname, tablename, pubname 
FROM pg_publication_tables 
WHERE tablename = 'assignment_attempts';

-- 2. Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'assignment_attempts';

-- 3. View recent assignment attempts (last 24 hours)
SELECT 
  aa.*,
  s.name as student_name,
  a.title as assignment_title,
  t.full_name as teacher_name
FROM assignment_attempts aa
JOIN students s ON aa.student_id = s.id
JOIN assignments a ON aa.assignment_id = a.id
JOIN teachers t ON a.teacher_id = t.id
WHERE aa.updated_at >= NOW() - INTERVAL '24 hours'
ORDER BY aa.updated_at DESC
LIMIT 20;

-- 4. Check for completed assignments that might not be syncing
SELECT 
  aa.id,
  aa.status,
  aa.score,
  aa.completed_at,
  aa.realtime_synced,
  s.name as student_name,
  a.title as assignment_title
FROM assignment_attempts aa
JOIN students s ON aa.student_id = s.id
JOIN assignments a ON aa.assignment_id = a.id
WHERE aa.status = 'completed'
AND aa.completed_at >= NOW() - INTERVAL '1 hour'
ORDER BY aa.completed_at DESC;

-- 5. Manual sync test - mark all recent completions as needing sync
UPDATE assignment_attempts 
SET realtime_synced = false, updated_at = NOW()
WHERE status = 'completed' 
AND completed_at >= NOW() - INTERVAL '1 hour';

-- 6. Check activity log for completion events
SELECT * FROM activity_log 
WHERE table_name = 'assignment_attempts' 
AND action = 'completed'
AND created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 7. Force a real-time notification (for testing)
SELECT refresh_assignment_attempts();

-- 8. Check for any error patterns in attempts
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as first_created,
  MAX(updated_at) as last_updated
FROM assignment_attempts
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;

-- 9. Verify teachers can see their students' attempts
-- Replace 'teacher_auth0_id' with actual teacher's Auth0 ID
SELECT 
  aa.*,
  s.name as student_name,
  a.title as assignment_title
FROM assignment_attempts aa
JOIN assignments a ON aa.assignment_id = a.id
JOIN teachers t ON a.teacher_id = t.id
JOIN students s ON aa.student_id = s.id
WHERE t.auth0_user_id = 'teacher_auth0_id' -- Replace with actual ID
ORDER BY aa.updated_at DESC
LIMIT 10;

-- 10. Check for students who have completed assignments recently
SELECT 
  s.name,
  s.access_token,
  COUNT(aa.id) as completed_assignments,
  MAX(aa.completed_at) as last_completion
FROM students s
LEFT JOIN assignment_attempts aa ON s.id = aa.student_id AND aa.status = 'completed'
WHERE aa.completed_at >= NOW() - INTERVAL '24 hours'
GROUP BY s.id, s.name, s.access_token
ORDER BY last_completion DESC;

-- If you need to manually trigger a completion for testing:
/*
UPDATE assignment_attempts 
SET 
  status = 'completed',
  score = 95.0,
  completed_at = NOW(),
  updated_at = NOW(),
  realtime_synced = true
WHERE id = 'your_attempt_id_here';
*/

-- Reset sync status if needed (forces real-time update):
/*
UPDATE assignment_attempts 
SET realtime_synced = false, updated_at = NOW()
WHERE status = 'completed';
*/