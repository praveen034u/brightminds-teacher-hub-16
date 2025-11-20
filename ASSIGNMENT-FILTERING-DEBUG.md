# Assignment Room Filtering Debug Guide

## Issue Description
When creating assignments and assigning them to a room with only 1 student, the assignment is still being seen by other students who are not in that room.

## Debugging Steps

### 1. Check Assignment Creation
When you create an assignment, check the browser console for these logs:
- `📝 Assignment data to insert:` - Shows the assignment data being sent
- `✅ Assignment created successfully:` - Shows the final assignment with Room ID

**What to verify:**
- `Room ID` should NOT be "None" - it should show the actual room UUID
- `Type` should be "room" for room assignments

### 2. Check Student Portal Access
When students access their portal, check the Supabase function logs for:
- `📚 Student [name] (ID: [id]) is in rooms:` - Shows which rooms the student belongs to
- `📋 Found X assignments for student` - Shows how many assignments they can see
- For each assignment: `✓ [Assignment Title] (Type: [type], Room: [room]) - [reason]`

**What to look for:**
- Students should only see assignments where the Room ID matches their room membership
- If a student sees an assignment with reason "Unknown reason - THIS SHOULD NOT HAPPEN!" - that's the bug

### 3. Verify Room Membership
Run this SQL query in Supabase to check room memberships:

```sql
-- Check which students are in which rooms
SELECT 
    s.name as student_name,
    r.name as room_name,
    r.id as room_id,
    rs.created_at as joined_room_at
FROM students s
JOIN room_students rs ON s.id = rs.student_id
JOIN rooms r ON rs.room_id = r.id
ORDER BY r.name, s.name;
```

### 4. Check Assignment Room Assignments
Run this SQL to see assignments and their room assignments:

```sql
-- Check assignment room assignments
SELECT 
    a.title as assignment_title,
    a.assignment_type,
    a.room_id,
    r.name as room_name,
    COUNT(rs.student_id) as students_in_room
FROM assignments a
LEFT JOIN rooms r ON a.room_id = r.id
LEFT JOIN room_students rs ON r.id = rs.room_id
GROUP BY a.id, a.title, a.assignment_type, a.room_id, r.name
ORDER BY a.created_at DESC;
```

### 5. Test Specific Scenario
To test the exact issue:

1. **Create a test setup:**
   - Create Room A with Student 1
   - Create Room B with Student 2
   - Create an assignment assigned ONLY to Room A

2. **Check the logs:**
   - Student 1 should see the assignment (reason: "Room assignment (student is in room [Room A ID])")
   - Student 2 should NOT see the assignment

3. **If Student 2 sees the assignment, check:**
   - Is Student 2 accidentally in Room A? (Check room membership query)
   - Is the assignment created without room_id? (Check assignment creation logs)
   - Is there a bug in the filtering? (Check student portal logs)

## Expected Behavior

### ✅ Correct Behavior:
- Assignment assigned to Room A with 1 student → Only that 1 student sees it
- Game assignments → All students of the teacher see them
- Unassigned room assignments (room_id = null) → All students of the teacher see them

### ❌ Incorrect Behavior:
- Assignment assigned to Room A → Students in Room B also see it
- Student portal logs show "Unknown reason - THIS SHOULD NOT HAPPEN!"

## Common Causes

### 1. Room Assignment Not Saved
- Check if `room_id` in assignment is actually null instead of the room ID
- This happens if frontend sends `selectedRoom = 'none'` when room was actually selected

### 2. Students in Multiple Rooms
- Student might be accidentally added to multiple rooms
- Check room membership SQL query above

### 3. Assignment Creation Bug
- Check the assignment creation logs to verify room_id is properly saved

### 4. Student Portal Query Bug  
- Check student portal logs to see if filtering logic is working correctly

## Quick Fix Commands

If you find the issue, here are the most likely fixes:

### Fix 1: If assignment was created without room_id by mistake
```sql
-- Update assignment to have correct room_id
UPDATE assignments 
SET room_id = 'CORRECT_ROOM_ID_HERE' 
WHERE id = 'ASSIGNMENT_ID_HERE';
```

### Fix 2: If student is in wrong room
```sql
-- Remove student from wrong room
DELETE FROM room_students 
WHERE student_id = 'STUDENT_ID' AND room_id = 'WRONG_ROOM_ID';
```

### Fix 3: If student should be in the room but isn't
```sql
-- Add student to correct room
INSERT INTO room_students (room_id, student_id) 
VALUES ('CORRECT_ROOM_ID', 'STUDENT_ID');
```

With the added logging, you should now be able to see exactly what's happening and identify the root cause of the issue.