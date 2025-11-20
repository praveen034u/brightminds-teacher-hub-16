-- MANUAL VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify the room assignment issue

-- Step 1: Check all students and their room memberships
SELECT 
    s.name as student_name,
    s.id as student_id,
    r.name as room_name,
    r.id as room_id,
    'Student is in this room' as status
FROM students s
JOIN room_students rs ON s.id = rs.student_id
JOIN rooms r ON rs.room_id = r.id
ORDER BY s.name, r.name;

-- Step 2: Check all assignments and their room assignments
SELECT 
    a.title as assignment_title,
    a.id as assignment_id,
    a.assignment_type,
    CASE 
        WHEN a.room_id IS NULL THEN 'No room (available to all)'
        ELSE a.room_id::text
    END as assigned_room_id,
    r.name as assigned_room_name,
    t.full_name as teacher_name
FROM assignments a
LEFT JOIN rooms r ON a.room_id = r.id
LEFT JOIN teachers t ON a.teacher_id = t.id
ORDER BY a.created_at DESC;

-- Step 3: Show what each student SHOULD see (manually calculated)
WITH student_assignments AS (
    SELECT 
        s.name as student_name,
        s.id as student_id,
        a.title as assignment_title,
        a.id as assignment_id,
        a.assignment_type,
        a.room_id as assignment_room_id,
        a.teacher_id as assignment_teacher_id,
        s.teacher_id as student_teacher_id,
        ARRAY_AGG(DISTINCT rs.room_id) as student_rooms
    FROM students s
    CROSS JOIN assignments a
    LEFT JOIN room_students rs ON s.id = rs.student_id
    GROUP BY s.id, s.name, a.id, a.title, a.assignment_type, a.room_id, a.teacher_id, s.teacher_id
)
SELECT 
    student_name,
    assignment_title,
    assignment_type,
    assignment_room_id,
    student_rooms,
    CASE 
        WHEN assignment_teacher_id != student_teacher_id THEN '❌ WRONG TEACHER'
        WHEN assignment_type = 'game' THEN '✅ SHOULD SEE (Game)'
        WHEN assignment_room_id IS NULL THEN '✅ SHOULD SEE (No room restriction)'
        WHEN assignment_room_id = ANY(student_rooms) THEN '✅ SHOULD SEE (In assigned room)'
        ELSE '❌ SHOULD NOT SEE (Not in assigned room)'
    END as visibility_status,
    CASE 
        WHEN assignment_teacher_id != student_teacher_id THEN 'Different teacher'
        WHEN assignment_type = 'game' THEN 'Game assignment from student teacher'
        WHEN assignment_room_id IS NULL THEN 'Unassigned room assignment from student teacher'
        WHEN assignment_room_id = ANY(student_rooms) THEN CONCAT('Student is in assigned room ', assignment_room_id)
        ELSE CONCAT('Student NOT in assigned room ', assignment_room_id, ' (student rooms: ', ARRAY_TO_STRING(student_rooms, ', '), ')')
    END as reason
FROM student_assignments
WHERE assignment_teacher_id = student_teacher_id  -- Only check assignments from student's teacher
ORDER BY student_name, assignment_title;

-- Step 4: FIND THE SPECIFIC BUG - Students seeing assignments they shouldn't
WITH student_assignments AS (
    SELECT 
        s.name as student_name,
        s.id as student_id,
        a.title as assignment_title,
        a.assignment_type,
        a.room_id as assignment_room_id,
        ARRAY_AGG(DISTINCT rs.room_id) FILTER (WHERE rs.room_id IS NOT NULL) as student_rooms
    FROM students s
    CROSS JOIN assignments a
    LEFT JOIN room_students rs ON s.id = rs.student_id
    WHERE a.teacher_id = s.teacher_id  -- Same teacher
    GROUP BY s.id, s.name, a.id, a.title, a.assignment_type, a.room_id
)
SELECT 
    '🚨 BUG FOUND!' as alert,
    student_name,
    assignment_title,
    assignment_room_id,
    student_rooms,
    'Student should NOT see this assignment but might be seeing it' as issue
FROM student_assignments
WHERE assignment_type = 'room' 
  AND assignment_room_id IS NOT NULL 
  AND NOT (assignment_room_id = ANY(student_rooms OR ARRAY[]::uuid[]))
ORDER BY student_name;

-- Step 5: Check if there are any duplicate room assignments
SELECT 
    s.name as student_name,
    r.name as room_name,
    COUNT(*) as duplicate_count
FROM students s
JOIN room_students rs ON s.id = rs.student_id
JOIN rooms r ON rs.room_id = r.id
GROUP BY s.id, s.name, r.id, r.name
HAVING COUNT(*) > 1;