-- SPECIFIC TEST for Room Assignment Issue
-- Run this to verify the exact scenario you described

-- 1. Show all rooms and their student members
SELECT 
    r.name as room_name,
    r.id as room_id,
    s.name as student_name,
    s.id as student_id,
    rs.created_at as added_to_room_at
FROM rooms r
LEFT JOIN room_students rs ON r.id = rs.room_id
LEFT JOIN students s ON rs.student_id = s.id
ORDER BY r.name, s.name;

-- 2. Show assignments and which rooms they're assigned to
SELECT 
    a.title as assignment_title,
    a.id as assignment_id,
    a.assignment_type,
    a.room_id,
    r.name as assigned_to_room,
    a.created_at
FROM assignments a
LEFT JOIN rooms r ON a.room_id = r.id
ORDER BY a.created_at DESC;

-- 3. Show what each student SHOULD see (simulation of student portal logic)
WITH student_room_memberships AS (
    SELECT 
        s.id as student_id,
        s.name as student_name,
        ARRAY_AGG(rs.room_id) FILTER (WHERE rs.room_id IS NOT NULL) as student_rooms
    FROM students s
    LEFT JOIN room_students rs ON s.id = rs.student_id
    GROUP BY s.id, s.name
),
assignment_visibility AS (
    SELECT 
        srm.student_name,
        srm.student_id,
        srm.student_rooms,
        a.title as assignment_title,
        a.id as assignment_id,
        a.room_id as assignment_room,
        a.assignment_type,
        CASE 
            WHEN a.assignment_type = 'game' THEN 'YES - Game assignment'
            WHEN a.room_id IS NULL THEN 'YES - Unassigned room assignment'
            WHEN a.room_id = ANY(srm.student_rooms) THEN 'YES - Student in assigned room'
            ELSE 'NO - Student not in assigned room'
        END as should_see_assignment,
        CASE 
            WHEN a.assignment_type = 'game' THEN 'Game from teacher'
            WHEN a.room_id IS NULL THEN 'Available to all students'
            WHEN a.room_id = ANY(srm.student_rooms) THEN CONCAT('Assigned to room student belongs to: ', a.room_id)
            ELSE CONCAT('❌ PROBLEM: Assigned to room ', a.room_id, ' but student only in rooms: ', ARRAY_TO_STRING(srm.student_rooms, ', '))
        END as reason
    FROM student_room_memberships srm
    CROSS JOIN assignments a
)
SELECT 
    student_name,
    assignment_title,
    assignment_type,
    assignment_room,
    should_see_assignment,
    reason
FROM assignment_visibility
ORDER BY student_name, assignment_title;

-- 4. SPECIFIC CHECK: Find students who can see assignments from rooms they're NOT in
WITH student_room_memberships AS (
    SELECT 
        s.id as student_id,
        s.name as student_name,
        ARRAY_AGG(rs.room_id) FILTER (WHERE rs.room_id IS NOT NULL) as student_rooms
    FROM students s
    LEFT JOIN room_students rs ON s.id = rs.student_id
    GROUP BY s.id, s.name
)
SELECT 
    srm.student_name,
    a.title as assignment_title,
    a.room_id as assignment_room_id,
    r.name as assignment_room_name,
    srm.student_rooms as student_is_in_rooms,
    '🚨 BUG: Student can see assignment from room they are NOT in!' as issue
FROM student_room_memberships srm
CROSS JOIN assignments a
LEFT JOIN rooms r ON a.room_id = r.id
WHERE a.assignment_type = 'room' 
  AND a.room_id IS NOT NULL 
  AND NOT (a.room_id = ANY(srm.student_rooms))
  AND EXISTS (
      -- This simulates the student portal query logic
      SELECT 1 
      FROM unnest(srm.student_rooms) as student_room
  );

-- 5. Check for duplicate room memberships (student added to same room multiple times)
SELECT 
    s.name as student_name,
    r.name as room_name,
    COUNT(*) as times_added_to_room
FROM students s
JOIN room_students rs ON s.id = rs.student_id
JOIN rooms r ON rs.room_id = r.id
GROUP BY s.id, s.name, r.id, r.name
HAVING COUNT(*) > 1;