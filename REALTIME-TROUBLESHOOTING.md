# Real-Time Updates Troubleshooting Guide

## Issue: Assignments Only Show After Page Refresh

If real-time updates are not working and assignments only appear after manually refreshing the page, follow these steps:

---

## Step 1: Run the Database Migration

**This is the most common cause of the issue!**

1. Open your Supabase Dashboard: https://app.supabase.com
2. Navigate to your project: `lfsmtsnakdaukxgrqynk`
3. Go to **SQL Editor** (left sidebar)
4. Create a new query
5. Copy and paste the contents of `migration-realtime.sql`
6. Click **Run** (or press Ctrl+Enter)

**Verify the migration worked:**

Run this query in the SQL Editor:
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

You should see 4 rows:
- `public.assignments`
- `public.rooms`
- `public.room_students`
- `public.students`

If you don't see these rows, the migration hasn't been applied yet.

---

## Step 2: Check Realtime is Enabled

1. In Supabase Dashboard, go to **Database** → **Replication**
2. Ensure "Realtime" is enabled
3. Check that the following tables are listed:
   - `assignments`
   - `rooms`
   - `room_students`
   - `students`

---

## Step 3: Check Browser Console Logs

1. **Open Student Portal** in browser
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. You should see these logs when the page loads:

```
=== SETTING UP REALTIME SUBSCRIPTION ===
Student ID: <student-id>
Student name: <student-name>
Current rooms: [...]
Creating channel: student-portal-<id>-<timestamp>
```

5. Look for subscription status:
```
=== SUBSCRIPTION STATUS UPDATE ===
Status: SUBSCRIBED
✅ Successfully subscribed to portal updates!
📡 Listening for:
  - assignments INSERT
  - assignments UPDATE
  - assignments DELETE
  - room_students ALL events
```

**If you see `SUBSCRIBED` status:** The connection is working! Proceed to Step 4.

**If you see `CHANNEL_ERROR` or `TIMED_OUT`:** There's a connection issue. Check:
- Internet connection
- Supabase project status (not paused)
- RLS policies (see Step 5)

---

## Step 4: Test Real-Time Assignment Creation

**Open TWO browser windows/tabs:**

1. **Browser A (Student Portal):**
   - Login as student
   - Open Developer Tools (F12)
   - Keep Console tab visible

2. **Browser B (Teacher Portal):**
   - Login as teacher
   - Navigate to a room where the student is enrolled
   - Create a new assignment

**Expected behavior in Browser A console:**
```
🔔 Assignment INSERT detected: {event: "INSERT", ...}
New assignment data: {id: "...", title: "...", ...}
Checking against student rooms: [...]
Assignment room_id: ...
✅ New assignment for student! Adding to list...
📝 Adding assignment to state
✅ Assignment added successfully!
```

**Expected behavior in Browser A UI:**
- Assignment appears immediately (no refresh needed)
- Toast notification: "New Assignment: [Title]"
- Green connection indicator shows connected

**If logs don't appear:**
- The migration hasn't been run (go back to Step 1)
- OR the student is not enrolled in the room
- OR RLS policies are blocking (see Step 5)

---

## Step 5: Verify RLS Policies

Run this query to check assignments RLS policy:

```sql
-- Check if student can see assignments
SELECT a.* 
FROM assignments a
JOIN room_students rs ON rs.room_id = a.room_id
WHERE rs.student_id = '<your-student-id>';
```

Replace `<your-student-id>` with the actual student ID.

If this returns empty but you know the student is in rooms with assignments, there's an RLS issue.

---

## Step 6: Check Connection Indicator

On the Student Portal page:
- **Green dot** = Real-time connected
- **Red dot** = Not connected

If you see a red dot:
1. Check console for error messages
2. Try refreshing the page
3. Check if Supabase project is active (not paused)

---

## Step 7: Network Tab Analysis

In Developer Tools:
1. Go to **Network** tab
2. Filter by **WS** (WebSocket)
3. You should see a WebSocket connection to `realtime-dev.supabase.com` or similar
4. Click on it and check:
   - Status should be "101 Switching Protocols"
   - Messages tab should show heartbeat messages

---

## Step 8: Supabase Project Status

1. Go to Supabase Dashboard
2. Check if your project is paused (free tier auto-pauses after inactivity)
3. If paused, restore it
4. Wait a few minutes for services to fully start

---

## Common Issues & Solutions

### Issue: "Assignment not for student rooms, ignoring"
**Cause:** Student is not enrolled in the room where the assignment was created.

**Solution:** 
1. Verify student is enrolled in the correct room
2. Check `room_students` table for the student's room assignments

### Issue: "Assignment already exists, skipping duplicate"
**Cause:** The assignment was already in the list (could be from initial load).

**Solution:** This is normal behavior to prevent duplicates. Not an error.

### Issue: No logs at all in console
**Cause:** JavaScript might be disabled or page didn't load correctly.

**Solution:**
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Try incognito/private mode

### Issue: Status shows "CLOSED" or "DISCONNECTED"
**Cause:** Network issue or Supabase connection problem.

**Solution:**
1. Check internet connection
2. The auto-reconnection logic should kick in (wait 10 seconds)
3. Check console for reconnection attempts
4. Manual refresh if auto-reconnect fails

---

## Testing Checklist

- [ ] Migration has been run in Supabase SQL Editor
- [ ] Verified 4 tables in `supabase_realtime` publication
- [ ] Realtime enabled in Database → Replication
- [ ] Console shows "SUBSCRIBED" status
- [ ] Green connection indicator visible
- [ ] WebSocket connection in Network tab
- [ ] Student enrolled in test room
- [ ] Two-browser test completed
- [ ] Console shows INSERT event logs
- [ ] Assignment appears without refresh
- [ ] Toast notification appears

---

## Still Not Working?

If you've completed all steps and it's still not working:

1. **Check Supabase logs:**
   - Dashboard → Logs → API Logs
   - Look for errors related to Realtime

2. **Check RLS policies:**
   - Ensure students can read assignments from their rooms
   - Test RLS policy with the SQL query in Step 5

3. **Verify data structure:**
   - Check that `room_id` exists in assignments table
   - Check foreign key relationships

4. **Last resort:**
   - Create a new Supabase project
   - Test with fresh database
   - Might be a project configuration issue

---

## Success Indicators

When everything is working correctly, you should see:

1. ✅ Green connection indicator
2. ✅ Console shows "SUBSCRIBED" status
3. ✅ New assignments appear instantly (no refresh)
4. ✅ Toast notifications for new assignments
5. ✅ WebSocket connection in Network tab
6. ✅ INSERT/UPDATE/DELETE events in console

---

## Developer Notes

**File modified:** `src/pages/StudentPortalPage.tsx`

**Key functions:**
- `setupRealtimeSubscription()` - Creates channel and event listeners
- `loadStudentData()` - Initial data fetch
- `attemptReconnect()` - Auto-reconnection logic

**Realtime Events:**
- `postgres_changes` → `INSERT` on `assignments`
- `postgres_changes` → `UPDATE` on `assignments`
- `postgres_changes` → `DELETE` on `assignments`
- `postgres_changes` → `*` (ALL) on `room_students`

**Connection States:**
- `SUBSCRIBED` = Working
- `CHANNEL_ERROR` = Failed
- `TIMED_OUT` = Connection timeout
- `CLOSED` = Disconnected
