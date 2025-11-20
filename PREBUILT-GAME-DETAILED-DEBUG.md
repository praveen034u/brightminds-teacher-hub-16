# PRE-BUILT GAME ROOM ASSIGNMENT - DEBUGGING GUIDE

## Issue
Pre-built game assignments assigned to specific rooms are still being shown to students in other rooms.

## Step-by-Step Debugging Process

### Step 1: Verify Frontend Room Selection
**Create a pre-built assignment and assign to specific room:**

1. Go to Assignments → Create Assignment
2. Select "Pre-built"
3. Choose any game
4. **IMPORTANT:** Select a specific room (e.g., "riddle game (1 students)")
5. Create assignment

**Check Browser Console for these logs:**
```
🏠 Room selection changed to: [room-uuid]
📊 Selected room "riddle game" has 1 students
🎯 PRE-BUILT GAME + ROOM ASSIGNMENT:
   Room Name: riddle game
   Room ID: [room-uuid]
   Students in Room: 1
   Assignment should ONLY go to students in this room!
```

### Step 2: Verify Backend Assignment Creation
**Check Supabase function logs for:**
```
📝 Assignment data to insert: { room_id: "[room-uuid]", ... }
✅ Assignment created successfully:
   - Title: [assignment title]
   - Type: game
   - Room ID: [room-uuid] (NOT "None")
   - Teacher ID: [teacher-uuid]
📊 Students in room [room-uuid]: [student name]
✅ Assignment "[title]" should ONLY be visible to: [student name]
```

**❌ If you see:**
```
- Room ID: None (available to all students)
```
**Then the backend is not receiving the room_id correctly.**

### Step 3: Verify Database Storage
**Run this SQL in Supabase SQL Editor:**
```sql
-- Check the most recent assignment
SELECT 
    title,
    assignment_type,
    room_id,
    game_id,
    created_at
FROM assignments 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:** room_id should be the UUID of the selected room, NOT null.

### Step 4: Test Student Portal Access
**Access student portals and check function logs:**

**Student in assigned room should see:**
```
🏠 ROOM MEMBERSHIP DEBUG for student [Name]:
   ✓ Room: riddle game (ID: [room-uuid])
📊 RAW ASSIGNMENTS from database for student [Name]:
  1. "[Assignment Title]" - Type: game, Room: [room-uuid], Game: [game-id]
✅ [Assignment Title] (Type: game, Room: [room-uuid]) - Game assignment assigned to student's room
```

**Student in different room should see:**
```
🏠 ROOM MEMBERSHIP DEBUG for student [Name]:
   ✓ Room: puzzle game (ID: [different-uuid])
📊 RAW ASSIGNMENTS from database for student [Name]:
  (Should be empty or not include the room-specific assignment)
```

### Step 5: Manual Database Verification
**Run the debug SQL script:** `debug-current-assignments.sql`

Look for the "🚨 PROBLEM FOUND!" section - it should be empty if working correctly.

## Common Issues & Fixes

### Issue 1: Frontend Not Sending Room ID
**Symptom:** Backend logs show `room_id: null` even when room selected
**Check:** Browser console logs from Step 1
**Fix:** Verify room selection dropdown is working

### Issue 2: Backend Not Saving Room ID  
**Symptom:** Assignment created with `Room ID: None`
**Check:** Supabase function logs from Step 2
**Fix:** Check if `body.room_id` is being received correctly

### Issue 3: Database Query Not Filtering Correctly
**Symptom:** Students see assignments they shouldn't
**Check:** Student portal function logs from Step 4
**Fix:** Verify the OR query logic in student-portal function

### Issue 4: Students in Multiple Rooms
**Symptom:** Student unexpectedly has access to assignment
**Check:** Room membership query:
```sql
SELECT s.name, r.name, r.id 
FROM students s 
JOIN room_students rs ON s.id = rs.student_id 
JOIN rooms r ON rs.room_id = r.id;
```

## Expected Flow (Working Correctly)

### 1. Frontend
```
Room Selected: riddle game (UUID: abc-123)
Data Sent: { room_id: "abc-123", roomType: "prebuilt", ... }
```

### 2. Backend
```  
Assignment Created: { room_id: "abc-123", assignment_type: "game" }
Students in Room: ["Student A"]
```

### 3. Student Portal Query
```
Student A (in room abc-123): Shows assignment ✅
Student B (in room def-456): Does NOT show assignment ✅
```

## Quick Test
1. Create assignment for specific room
2. Check if assignment has room_id in database:
```sql
SELECT title, room_id FROM assignments ORDER BY created_at DESC LIMIT 1;
```
3. If room_id is null → Frontend/Backend issue
4. If room_id is correct → Student portal query issue

## Report Results
Share these specific logs/results:
1. Browser console logs from assignment creation
2. Supabase function logs from assignment creation  
3. Supabase function logs from student portal access
4. Results of the database verification SQL queries

This will pinpoint exactly where the issue is occurring.