# Real-Time Testing Guide - Step by Step

## 🧪 How to Test Real-Time Assignment Updates

### Prerequisites
1. ✅ Run `migration-realtime.sql` in Supabase SQL Editor
2. ✅ Have at least one student created with an access link
3. ✅ Have at least one room created
4. ✅ Student assigned to the room

---

## Test 1: New Assignment Notification

### Setup (2 Browser Windows)

**Window 1 - Student Portal:**
```
1. Open browser (or incognito window)
2. Paste student's access link
3. You should see:
   - Student's name in header
   - Green pulsing dot: "Live Updates Active" ✅
   - Student's rooms listed
   - Existing assignments (if any)
```

**Window 2 - Teacher Dashboard:**
```
1. Open regular browser window
2. Login as teacher
3. Navigate to Assignments page
```

### Execute Test

**In Teacher Window:**
```
1. Click "Create Assignment"
2. Fill in form:
   - Title: "Test Assignment - Real-Time"
   - Description: "This is a test for WebSocket updates"
   - Room: [Select room student is in]
   - Due Date: [Any future date]
3. Click "Create Assignment"
```

**Watch Student Window:**
```
Expected within 1 second:
✅ Toast notification appears: "New Assignment: Test Assignment - Real-Time"
✅ Toast shows: "Posted in [Room Name]"
✅ New assignment card appears in "My Assignments" section
✅ No page refresh needed!
```

### Success Criteria
- [ ] Toast appears within 1 second
- [ ] Assignment appears in list
- [ ] Assignment shows correct details
- [ ] Green "Live Updates Active" still visible

---

## Test 2: Assignment Update

### Execute Test

**In Teacher Window:**
```
1. Find the assignment you just created
2. Click edit/update
3. Change the title to: "Updated Assignment Title"
4. Change due date to tomorrow
5. Save changes
```

**Watch Student Window:**
```
Expected within 1 second:
✅ Toast: "An assignment was updated"
✅ Assignment title updates automatically
✅ Due date updates automatically
✅ No page refresh!
```

### Success Criteria
- [ ] Toast appears
- [ ] Title updates
- [ ] Due date updates
- [ ] Changes reflected immediately

---

## Test 3: Assignment Deletion

### Execute Test

**In Teacher Window:**
```
1. Delete the test assignment
2. Confirm deletion
```

**Watch Student Window:**
```
Expected within 1 second:
✅ Toast: "An assignment was removed"
✅ Assignment card disappears from list
✅ List updates automatically
```

### Success Criteria
- [ ] Toast appears
- [ ] Assignment removed from list
- [ ] No errors in console

---

## Test 4: Multiple Students

### Setup
```
1. Create 2-3 students
2. Assign them to the same room
3. Open student portal for each in different browsers/tabs
```

### Execute Test
```
Teacher creates one assignment
```

### Expected Result
```
✅ ALL students see the toast notification
✅ ALL students see the new assignment
✅ Each gets notification within 1 second
```

---

## Test 5: Connection Resilience

### Execute Test

**In Student Window:**
```
1. Open Developer Console (F12)
2. Go to Network tab
3. Throttle to "Slow 3G"
4. Teacher creates assignment
```

### Expected Result
```
✅ Assignment still appears (takes 2-5 seconds)
✅ WebSocket reconnects automatically
✅ No errors shown to student
```

---

## Test 6: Room Filtering (Security)

### Setup
```
Student A: Assigned to "Math Class"
Student B: Assigned to "Science Lab"
```

### Execute Test
```
Teacher creates assignment for "Math Class"
```

### Expected Result
```
✅ Student A sees the assignment + notification
❌ Student B does NOT see it (different room)
✅ Each student only sees their room's assignments
```

---

## Debugging

### Console Messages to Look For

**Student Portal Console (F12):**
```javascript
// On page load:
"Setting up Realtime subscription for rooms: [room-id-1, room-id-2]"

// When assignment created:
"New assignment detected: {assignment_data}"

// On cleanup:
"Cleaning up Realtime subscription"
```

### Check WebSocket Connection

**In Browser DevTools:**
```
1. Press F12
2. Go to "Network" tab
3. Filter by "WS" (WebSocket)
4. Should see connection to "supabase.co"
5. Status: "101 Switching Protocols" ✅
```

### Verify Realtime Enabled

**In Supabase SQL Editor:**
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename = 'assignments';
```

Expected result:
```
schemaname | tablename
-----------+-----------
public     | assignments
```

---

## Common Issues & Fixes

### Issue: No Toast Notification

**Check:**
```
1. Browser console for errors
2. "Live Updates Active" indicator visible?
3. Student assigned to the room?
4. Realtime migration run?
```

**Fix:**
```sql
-- Run in Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
```

### Issue: Assignment Appears But No Toast

**Check:**
```javascript
// Console should show:
"New assignment detected: {...}"
```

**Fix:**
- Clear browser cache
- Refresh student portal
- Check browser notification permissions

### Issue: Delayed Updates (> 5 seconds)

**Check:**
1. Internet connection speed
2. Supabase project region (latency)
3. Browser tab active (not backgrounded)?

**Fix:**
- Keep student tab active
- Check network throttling off
- Refresh page if persistent

### Issue: "Live Updates Active" Not Showing

**Check Console:**
```javascript
// Should see:
"Setting up Realtime subscription..."
```

**Fix:**
1. Check Supabase client initialized
2. Verify `@supabase/supabase-js` installed
3. Check token is valid

---

## Performance Benchmarks

### Expected Metrics

| Metric | Expected | Acceptable |
|--------|----------|------------|
| Notification delay | < 1 sec | < 3 sec |
| Assignment appears | < 1 sec | < 3 sec |
| WebSocket connect | < 2 sec | < 5 sec |
| Memory usage | < 50 MB | < 100 MB |

### How to Measure

**Chrome DevTools:**
```
1. F12 → Performance tab
2. Record session
3. Create assignment
4. Stop recording
5. Check "User Timing" for delays
```

---

## Production Checklist

Before going live:

- [ ] `migration-realtime.sql` executed
- [ ] All 6 tests above pass
- [ ] No console errors
- [ ] WebSocket connection stable
- [ ] Toast notifications appear
- [ ] Multiple students tested
- [ ] Room filtering works correctly
- [ ] Assignment updates work
- [ ] Assignment deletions work
- [ ] "Live Updates Active" shows
- [ ] Mobile browser tested

---

## Demo Script

**For showing to others:**

```
1. "Let me show you real-time updates..."

2. [Open student portal]
   "Notice the green dot - Live Updates Active"

3. [Open teacher dashboard in split screen]
   "I'll create an assignment..."

4. [Fill form and submit]
   "Watch the student screen..."

5. [Toast appears + assignment shows]
   "See? Instant update! No refresh needed!"

6. "This uses WebSocket technology"
   "Students get notifications within 1 second"
```

---

## Success Criteria Summary

✅ **Functionality:**
- New assignments appear instantly
- Updates reflect immediately
- Deletions remove items
- Toast notifications show

✅ **Performance:**
- < 1 second delay
- No page refresh needed
- Low bandwidth usage
- Stable connection

✅ **Security:**
- Students only see their rooms
- Room filtering works
- RLS policies enforced

✅ **User Experience:**
- Clear visual feedback
- Helpful notifications
- "Live Updates Active" indicator
- No errors or confusion

---

**Ready to test?** Start with Test 1 above! 🚀
