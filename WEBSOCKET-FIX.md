# WebSocket Real-Time Updates Fix

## Issue
New students and assignments created by the teacher were not appearing in real-time on the student portal page.

## Root Cause
The WebSocket subscription was only listening to `assignments` table changes. When:
1. A new student was added to a room (via `room_students` table INSERT)
2. A student was removed from a room (via `room_students` table DELETE)
3. The classmates list changed

The student portal wouldn't automatically update because it wasn't subscribed to `room_students` table changes.

## Solution

### 1. Enhanced WebSocket Subscription
Updated `StudentPortalPage.tsx` to listen for multiple table changes:

**What's being monitored now:**
- ✅ `assignments` table (INSERT, UPDATE, DELETE) - for new/updated/deleted assignments
- ✅ `room_students` table (ALL events) - for when students are added/removed from rooms

**Smart Filtering:**
The subscription intelligently filters events:
- **Assignment changes**: Only shows assignments for rooms the student is in
- **Room assignment changes**: Detects when:
  - The current student is added/removed from a room
  - A new classmate is added to one of the student's rooms
  - Automatically reloads all student data to reflect changes

### 2. Updated Database Migration
Added `students` table to the Realtime publication in `migration-realtime.sql`:

```sql
-- Enable Realtime for students table (for student profile updates)
ALTER PUBLICATION supabase_realtime ADD TABLE students;
```

## How It Works Now

### Scenario 1: Teacher Creates New Assignment
1. Teacher creates assignment in `AssignmentsPage.tsx`
2. Backend inserts record into `assignments` table
3. WebSocket broadcasts INSERT event
4. Student portal receives event
5. Checks if assignment is for student's room
6. ✅ If yes: Adds assignment to list + shows toast notification
7. ❌ If no: Ignores event

### Scenario 2: Teacher Adds Student to Room
1. Teacher assigns student to room in `StudentsPage.tsx` or `RoomDetailPage.tsx`
2. Backend inserts record into `room_students` table
3. WebSocket broadcasts INSERT event
4. Student portal receives event
5. Checks if event involves current student OR one of their rooms
6. ✅ If yes: Reloads entire student data (rooms, classmates, assignments)
7. Shows toast: "Your classroom assignments have been updated"

### Scenario 3: New Classmate Added
1. Teacher adds another student to a room
2. Backend inserts into `room_students` table
3. WebSocket broadcasts INSERT event
4. All students in that room receive the event
5. Their portals reload data
6. New classmate appears in "My Classmates" section

## Code Changes

### StudentPortalPage.tsx
```typescript
// Before: Only listened to assignments
.channel('student-assignments')
.on('postgres_changes', { table: 'assignments' }, ...)

// After: Listens to assignments AND room_students
.channel('student-portal-updates')
.on('postgres_changes', { table: 'assignments' }, ...)
.on('postgres_changes', { table: 'room_students', event: '*' }, ...)
```

### Key Features
- **Client-side filtering**: More reliable than server-side
- **Automatic data refresh**: Reloads when room assignments change
- **Visual feedback**: Toast notifications for all updates
- **Connection status**: Green dot = connected, gray dot = connecting

## Testing Steps

### Prerequisites
1. **Run the database migration** in Supabase SQL Editor:
   ```sql
   -- Copy contents from migration-realtime.sql
   ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
   ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
   ALTER PUBLICATION supabase_realtime ADD TABLE room_students;
   ALTER PUBLICATION supabase_realtime ADD TABLE students;
   ```

2. **Verify Realtime is enabled**:
   ```sql
   SELECT schemaname, tablename 
   FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   ```
   Should show: `assignments`, `rooms`, `room_students`, `students`

### Test Case 1: New Assignment Appears Instantly
1. Open Student Portal in Browser A (student token)
2. Open Teacher Dashboard in Browser B
3. In Browser B: Create new assignment for student's room
4. **Expected in Browser A**:
   - ✅ Green dot should be visible (Live Updates Active)
   - ✅ New assignment appears immediately (no refresh needed)
   - ✅ Toast notification: "New Assignment: [title]"
   - ✅ Console shows: "Assignment INSERT detected"

### Test Case 2: New Student Added to Room
1. Open Student Portal in Browser A (student 1)
2. Open Teacher Dashboard in Browser B
3. In Browser B: Create new student (student 2) and assign to same room
4. **Expected in Browser A**:
   - ✅ Toast notification: "Your classroom assignments have been updated"
   - ✅ New classmate appears in "My Classmates" section
   - ✅ Console shows: "room_students change detected"

### Test Case 3: Multiple Students See Same Assignment
1. Create 2 students, assign both to Room A
2. Open Student Portal for Student 1 in Browser A
3. Open Student Portal for Student 2 in Browser B
4. Open Teacher Dashboard in Browser C
5. In Browser C: Create assignment for Room A
6. **Expected in Browser A & B**:
   - ✅ Both see assignment appear simultaneously
   - ✅ Both show toast notification
   - ✅ Both show green connection dot

### Test Case 4: Connection Status Indicator
1. Open Student Portal
2. **Expected**:
   - Initially shows gray dot: "Connecting..."
   - After 1-2 seconds: green dot: "Live Updates Active"
   - Console shows: "✅ Successfully subscribed to portal updates!"

## Troubleshooting

### Issue: Assignments Still Not Appearing
**Check:**
1. Migration has been run (Realtime enabled)
2. Browser console shows: "✅ Successfully subscribed to portal updates!"
3. Green connection dot is visible
4. Assignment is for correct room

**Debug:**
```javascript
// Open browser console on student portal
// Should see these logs when assignment created:
// "Assignment INSERT detected: {id: ..., title: ..., room_id: ...}"
// "New assignment for student! Adding to list..."
```

### Issue: "Connecting..." Never Changes to Green Dot
**Check:**
1. Realtime is enabled in Supabase Dashboard > Project Settings > API
2. Migration was run successfully
3. Internet connection is stable
4. Supabase project is active (not paused)

### Issue: New Classmates Not Appearing
**Check:**
1. Both students are assigned to the same room
2. room_students table has correct records
3. Console shows: "room_students change detected"

## Connection Status Meanings
- 🟢 **Green pulsing dot** = "Live Updates Active" - Connected and working
- ⚪ **Gray dot** = "Connecting..." - Establishing connection
- No dot = Not connected (check migration and console for errors)

## Performance Notes
- Uses **client-side filtering** for reliability
- Subscribes to ALL events, filters in JavaScript
- Automatically reconnects if connection drops
- Efficient: Only reloads data when room assignments change
- Incremental updates for assignments (no full reload needed)

## Next Steps
1. ✅ Run migration-realtime.sql in Supabase
2. ✅ Test with multiple browsers/students
3. ✅ Verify console logs show events
4. ✅ Confirm green connection dot appears
5. ✅ Test all scenarios above
