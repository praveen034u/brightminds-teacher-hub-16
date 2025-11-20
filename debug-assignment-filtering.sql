-- Debug script to check assignment room filtering
-- Run this in Supabase SQL Editor to understand the issue

-- 1. Check current assignments and their room assignments
SELECT 
    a.id,
    a.title,
    a.assignment_type,
    a.room_id,
    r.name as room_name,
    a.teacher_id
FROM assignments a
LEFT JOIN rooms r ON a.room_id = r.id
ORDER BY a.created_at DESC;

-- 2. Check students and their room memberships
SELECT 
    s.id as student_id,
    s.name as student_name,
    rs.room_id,
    r.name as room_name,
    s.teacher_id
FROM students s
LEFT JOIN room_students rs ON s.id = rs.student_id
LEFT JOIN rooms r ON rs.room_id = r.id
ORDER BY s.name;

-- 3. Simulate the student portal query for a specific student
-- Replace 'STUDENT_ID_HERE' with actual student ID
-- This shows what assignments a student should see
/*
WITH student_rooms AS (
    SELECT room_id 
    FROM room_students 
    WHERE student_id = 'STUDENT_ID_HERE'
),
student_info AS (
    SELECT teacher_id 
    FROM students 
    WHERE id = 'STUDENT_ID_HERE'
)
SELECT 
    a.id,
    a.title,
    a.assignment_type,
    a.room_id,
    r.name as room_name,
    CASE 
        WHEN a.room_id IN (SELECT room_id FROM student_rooms) THEN 'YES - In student room'
        WHEN a.assignment_type = 'game' AND a.teacher_id = (SELECT teacher_id FROM student_info) THEN 'YES - Game from teacher'
        ELSE 'NO - Should not see'
    END as should_student_see
FROM assignments a
LEFT JOIN rooms r ON a.room_id = r.id
WHERE a.teacher_id = (SELECT teacher_id FROM student_info)
ORDER BY a.created_at DESC;
*/

-- 4. Check for potential issues - students in multiple rooms
SELECT 
    s.name as student_name,
    COUNT(rs.room_id) as rooms_count,
    STRING_AGG(r.name, ', ') as room_names
FROM students s
LEFT JOIN room_students rs ON s.id = rs.student_id
LEFT JOIN rooms r ON rs.room_id = r.id
GROUP BY s.id, s.name
HAVING COUNT(rs.room_id) > 1;

-- 5. Check assignments without room assignments (should be available to all students)
SELECT 
    a.id,
    a.title,
    a.assignment_type,
    a.room_id,
    'Available to all students of this teacher' as note
FROM assignments a
WHERE a.room_id IS NULL
ORDER BY a.created_at DESC;