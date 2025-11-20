-- IMMEDIATE DEBUG: Check current assignment data in database
-- Run this in Supabase SQL Editor to see actual assignment data

-- 1. Show all recent assignments with their room assignments
SELECT 
    a.title,
    a.assignment_type,
    a.room_id,
    a.game_id,
    r.name as room_name,
    a.created_at,
    t.full_name as teacher_name
FROM assignments a
LEFT JOIN rooms r ON a.room_id = r.id  
LEFT JOIN teachers t ON a.teacher_id = t.id
ORDER BY a.created_at DESC
LIMIT 10;

-- 2. Check which students are in each room
SELECT 
    r.name as room_name,
    r.id as room_id,
    s.name as student_name,
    s.id as student_id
FROM rooms r
LEFT JOIN room_students rs ON r.id = rs.room_id
LEFT JOIN students s ON rs.student_id = s.id
ORDER BY r.name, s.name;

-- 3. Simulate student portal query for each student
-- This shows exactly what each student should see
WITH student_assignments AS (
    SELECT 
        s.name as student_name,
        s.id as student_id,
        a.title as assignment_title,
        a.assignment_type,
        a.room_id as assignment_room_id,
        r.name as assignment_room_name,
        ARRAY_AGG(DISTINCT student_rooms.room_id) FILTER (WHERE student_rooms.room_id IS NOT NULL) as student_room_ids
    FROM students s
    CROSS JOIN assignments a
    LEFT JOIN rooms r ON a.room_id = r.id
    LEFT JOIN room_students student_rooms ON s.id = student_rooms.student_id
    WHERE a.teacher_id = s.teacher_id  -- Same teacher
    GROUP BY s.id, s.name, a.id, a.title, a.assignment_type, a.room_id, r.name
)
SELECT 
    student_name,
    assignment_title,
    assignment_type,
    assignment_room_name,
    assignment_room_id,
    student_room_ids,
    CASE 
        WHEN assignment_room_id IS NULL THEN '✅ YES - Unassigned (available to all)'
        WHEN assignment_room_id = ANY(student_room_ids) THEN '✅ YES - Student in assigned room'
        ELSE '❌ NO - Student NOT in assigned room'
    END as should_see_assignment
FROM student_assignments
ORDER BY student_name, assignment_title;

-- 4. Find the specific problem - assignments students shouldn't see but might be seeing
WITH problem_assignments AS (
    SELECT 
        s.name as student_name,
        s.id as student_id,
        a.title as assignment_title,
        a.room_id as assignment_room_id,
        ARRAY_AGG(DISTINCT rs.room_id) FILTER (WHERE rs.room_id IS NOT NULL) as student_room_ids
    FROM students s
    CROSS JOIN assignments a
    LEFT JOIN room_students rs ON s.id = rs.student_id
    WHERE a.teacher_id = s.teacher_id 
      AND a.room_id IS NOT NULL  -- Only room-specific assignments
    GROUP BY s.id, s.name, a.id, a.title, a.room_id
    HAVING NOT (a.room_id = ANY(ARRAY_AGG(DISTINCT rs.room_id) FILTER (WHERE rs.room_id IS NOT NULL)))
)
SELECT 
    '🚨 PROBLEM FOUND!' as alert,
    student_name,
    assignment_title,
    assignment_room_id,
    student_room_ids,
    'This student should NOT see this assignment' as issue
FROM problem_assignments;