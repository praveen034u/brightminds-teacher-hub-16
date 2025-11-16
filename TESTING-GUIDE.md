# Quick Test Guide - WebSocket Real-Time Updates

## ⚡ Before You Test

### 1. Run Migration (CRITICAL - Do This First!)
```sql
-- Copy and run in Supabase Dashboard > SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_students;
ALTER PUBLICATION supabase_realtime ADD TABLE students;
```

### 2. Verify Migration Worked
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```
**Expected:** Should show 4 tables

---

## 🧪 Test 1: New Assignment Appears Instantly (2 min)

### Setup
1. Create a room (e.g., "Math 101")
2. Create a student (e.g., "John Doe")
3. Assign John to Math 101 room
4. Copy John's access link

### Test Steps
1. **Browser A:** Open John's student portal (paste access link)
2. **Check:** Green pulsing dot in top-right? ✅
3. **Browser B:** Open teacher dashboard
4. **Browser B:** Go to Assignments > Create New Assignment
   - Title: "Homework 1"
   - Room: Math 101
   - Click Save
5. **Browser A:** Watch the assignments section

### Expected Results
- ✅ Assignment appears **within 1-2 seconds** (no refresh needed)
- ✅ Toast notification: "New Assignment: Homework 1"
- ✅ Console log: "Assignment INSERT detected"
- ✅ Console log: "New assignment for student! Adding to list..."

### If It Fails
- Check green dot is showing (if gray, migration not run)
- Open browser console (F12), look for errors
- Verify assignment was saved to correct room

---

## 🧪 Test 2: New Classmate Appears (3 min)

### Setup
1. Use same room from Test 1 (Math 101)
2. John's portal still open in Browser A

### Test Steps
1. **Browser B (Teacher):** Go to Students > Add New Student
   - Name: "Jane Smith"
   - Email: jane@example.com
   - Click Save
2. **Browser B:** Assign Jane to Math 101 room
3. **Browser A:** Watch the "My Classmates" section

### Expected Results
- ✅ Toast: "A new classmate joined your classroom"
- ✅ Jane Smith appears in classmates section
- ✅ Shows "Math 101" badge under Jane's name
- ✅ Console log: "room_students change detected"
- ✅ Console log: "Room assignment change detected! Reloading..."

### If It Fails
- Check `room_students` table has Jane's assignment
- Verify both students are in same room
- Check console for subscription errors

---

## 🧪 Test 3: Multiple Students See Same Assignment (4 min)

### Setup
1. Create 2 students: Student A, Student B
2. Assign both to Room 1
3. Get access links for both

### Test Steps
1. **Browser A:** Open Student A portal
2. **Browser B:** Open Student B portal  
3. **Browser C:** Open teacher dashboard
4. **Check:** Both Browser A & B show green dot ✅
5. **Browser C:** Create assignment for Room 1
6. **Watch:** Browser A and Browser B simultaneously

### Expected Results
- ✅ **Both** browsers show assignment at the same time
- ✅ **Both** show toast notification
- ✅ Timing difference less than 2 seconds

---

## 🧪 Test 4: Assignment Doesn't Duplicate (2 min)

### Setup
1. Student portal open
2. Assignment already showing

### Test Steps
1. Count assignments currently showing (e.g., 1 assignment)
2. **Teacher:** Add another student to the same room
3. **Student portal:** Wait for reload (you'll see toast)
4. Count assignments again

### Expected Results
- ✅ Same number of assignments (no duplicates)
- ✅ Console shows: "Assignment already exists, skipping duplicate"

---

## 🧪 Test 5: Student Added to New Room (2 min)

### Setup
1. Student A in Room 1 only
2. Room 2 exists with 1 assignment

### Test Steps
1. **Browser A:** Open Student A portal
2. **Check:** Only sees Room 1 (1 classroom)
3. **Teacher:** Assign Student A to Room 2
4. **Browser A:** Watch "My Classrooms" section

### Expected Results
- ✅ Toast: "Your classroom assignments have been updated"
- ✅ Room 2 appears in classrooms
- ✅ Room 2's assignment appears in assignments list
- ✅ Classmates from Room 2 appear

---

## ✅ Success Indicators

### Visual Cues
- 🟢 Green pulsing dot (Live Updates Active)
- Toast notifications appearing
- Data updating without page refresh

### Console Logs (F12 Developer Tools)
```
✅ Successfully subscribed to portal updates!
Assignment INSERT detected: {...}
New assignment for student! Adding to list...
room_students change detected: {...}
Event type: INSERT
```

### Database State
- `assignments` table has records
- `room_students` has student-room mappings
- Realtime publication includes all 4 tables

---

## 🐛 Common Issues

### Issue: Gray dot, never turns green
**Fix:** Run the migration SQL in Supabase Dashboard

### Issue: "Live updates connection failed" error
**Fix:** 
1. Check internet connection
2. Verify Supabase project is not paused
3. Check browser console for specific errors

### Issue: Assignments appear but with 5-10 second delay
**Status:** This is normal on slow networks - acceptable

### Issue: No toast notifications
**Fix:**
1. Check browser permissions for notifications
2. Verify toast system is working (should see "Live updates connected!" on load)

---

## 📊 Performance Benchmarks

### Normal Behavior
- WebSocket connection: < 2 seconds
- Assignment INSERT event propagation: 100-500ms
- room_students event propagation: 100-500ms  
- Full data reload: 200-800ms

### If Slower
- Check network tab (F12) for API latency
- Verify Supabase region is close to your location
- Check for rate limiting

---

## 🎯 Quick Verification (30 seconds)

Just want to verify it's working?

1. Open student portal
2. Look for 🟢 green dot
3. Open console (F12)
4. Should see: "✅ Successfully subscribed to portal updates!"

**Green dot + Console message = Working!** ✅

---

## 📝 Testing Matrix

| Test | What | Expected | Time |
|------|------|----------|------|
| 1 | New assignment | Appears instantly | 2 min |
| 2 | New classmate | Shows in list | 3 min |
| 3 | Multi-student | Both see it | 4 min |
| 4 | No duplicates | Same count | 2 min |
| 5 | New room | Updates all | 2 min |

**Total testing time: ~13 minutes**

---

Need detailed explanation? See `WEBSOCKET-IMPROVEMENTS.md`
