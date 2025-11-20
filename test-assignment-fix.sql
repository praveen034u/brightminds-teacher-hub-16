-- Test script to verify the assignment filtering fix
-- Run this in Supabase SQL Editor after the changes

-- Check if we have assignments and their room assignments
SELECT 
    a.id,
    a.title,
    a.assignment_type,
    a.room_id,
    r.name as room_name,
    COUNT(rs.student_id) as students_in_room
FROM assignments a
LEFT JOIN rooms r ON a.room_id = r.id
LEFT JOIN room_students rs ON r.id = rs.room_id
GROUP BY a.id, a.title, a.assignment_type, a.room_id, r.name
ORDER BY a.created_at DESC;

-- Check room-student assignments
SELECT 
    r.name as room_name,
    COUNT(rs.student_id) as student_count,
    STRING_AGG(s.name, ', ') as student_names
FROM rooms r
LEFT JOIN room_students rs ON r.id = rs.room_id
LEFT JOIN students s ON rs.student_id = s.id
GROUP BY r.id, r.name
ORDER BY r.name;

-- Check assignment attempts vs room assignments
SELECT 
    a.title as assignment_title,
    a.assignment_type,
    r.name as assigned_room,
    COUNT(DISTINCT rs.student_id) as students_in_room,
    COUNT(DISTINCT aa.student_id) as students_with_attempts
FROM assignments a
LEFT JOIN rooms r ON a.room_id = r.id
LEFT JOIN room_students rs ON r.id = rs.room_id
LEFT JOIN assignment_attempts aa ON a.id = aa.assignment_id
GROUP BY a.id, a.title, a.assignment_type, r.name
ORDER BY a.created_at DESC;