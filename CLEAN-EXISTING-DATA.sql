-- =====================================================
-- CLEAN EXISTING DATA (OPTIONAL - USE WITH CAUTION!)
-- =====================================================
-- ⚠️ WARNING: This will DELETE data from your tables!
-- Only run this if you want to start fresh with clean data
-- Make sure you have backups if needed!

-- =====================================================
-- PART 1: Check what data exists (before cleaning)
-- =====================================================

-- Count records in each table
SELECT 'question_papers' as table_name, COUNT(*) as record_count FROM question_papers
UNION ALL
SELECT 'assignments' as table_name, COUNT(*) as record_count FROM assignments
UNION ALL
SELECT 'assignment_attempts' as table_name, COUNT(*) as record_count FROM assignment_attempts
UNION ALL
SELECT 'students' as table_name, COUNT(*) as record_count FROM students
UNION ALL
SELECT 'teachers' as table_name, COUNT(*) as record_count FROM teachers;

-- =====================================================
-- PART 2: Backup (Export) Current Data (RECOMMENDED!)
-- =====================================================

-- Before running cleanup, you can backup your data by running these:
-- Go to Supabase > Table Editor > Select table > Export as CSV

-- Or view current data:
SELECT * FROM question_papers ORDER BY created_at DESC LIMIT 10;
SELECT * FROM assignments ORDER BY created_at DESC LIMIT 10;
SELECT * FROM assignment_attempts ORDER BY created_at DESC LIMIT 10;

-- =====================================================
-- PART 3: Clean Data (Uncomment to run)
-- =====================================================

-- Step 1: Delete assignment_attempts (must be first due to foreign keys)
-- DELETE FROM assignment_attempts;

-- Step 2: Delete assignments (must be before question_papers)
-- DELETE FROM assignments;

-- Step 3: Delete question_papers
-- DELETE FROM question_papers;

-- Step 4: (Optional) Clean room_students junction table
-- DELETE FROM room_students;

-- Step 5: (Optional) Reset rooms if needed
-- DELETE FROM rooms;

-- Note: Usually you DON'T want to delete students and teachers!
-- But if you do:
-- DELETE FROM students;
-- DELETE FROM teachers;

-- =====================================================
-- PART 4: Reset Auto-increment Sequences (if needed)
-- =====================================================

-- This is usually not needed for UUID-based tables
-- But if you have any serial/integer IDs, you can reset them:

-- Reset sequences (uncomment if needed)
-- ALTER SEQUENCE IF EXISTS question_papers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS assignments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS assignment_attempts_id_seq RESTART WITH 1;

-- =====================================================
-- PART 5: Verify Clean (after running cleanup)
-- =====================================================

-- Check that tables are empty
SELECT 'question_papers' as table_name, COUNT(*) as record_count FROM question_papers
UNION ALL
SELECT 'assignments' as table_name, COUNT(*) as record_count FROM assignments
UNION ALL
SELECT 'assignment_attempts' as table_name, COUNT(*) as record_count FROM assignment_attempts;

-- Should show 0 records if cleanup was successful

-- =====================================================
-- PART 6: Selective Cleanup (Alternative)
-- =====================================================

-- If you don't want to delete ALL data, you can be selective:

-- Delete only test/demo data
-- DELETE FROM assignments WHERE title LIKE '%test%' OR title LIKE '%demo%';
-- DELETE FROM question_papers WHERE title LIKE '%test%' OR title LIKE '%demo%';

-- Delete only old data (older than 30 days)
-- DELETE FROM assignment_attempts WHERE created_at < NOW() - INTERVAL '30 days';
-- DELETE FROM assignments WHERE created_at < NOW() - INTERVAL '30 days' AND status != 'active';

-- Delete only data from specific teacher
-- DELETE FROM assignments WHERE teacher_id = 'specific_teacher_auth0_id';
-- DELETE FROM question_papers WHERE teacher_id = 'specific_teacher_auth0_id';

-- Delete only incomplete assignment attempts
-- DELETE FROM assignment_attempts WHERE status = 'not_started' OR status = 'in_progress';

-- =====================================================
-- PART 7: Safe Cleanup for Testing
-- =====================================================

-- This is the RECOMMENDED approach for testing:
-- Mark old assignments as inactive instead of deleting

-- Deactivate old assignments
-- UPDATE assignments SET status = 'archived' WHERE status = 'active';

-- Or mark as completed
-- UPDATE assignment_attempts SET status = 'completed' WHERE status = 'in_progress';

-- This way you preserve data but clean up the UI

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '⚠️  To actually clean data, uncomment the DELETE statements above' as instruction;
SELECT '💡 Tip: Mark assignments as "archived" instead of deleting' as tip;
SELECT '🔒 Remember to backup before deleting!' as warning;
