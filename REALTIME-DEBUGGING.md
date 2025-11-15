# WebSocket Real-Time Debugging Guide

## Issue: Assignments not showing on student page in real-time

This guide helps diagnose and fix issues with real-time assignment updates.

---

## ✅ Step-by-Step Debugging

### Step 1: Verify Database Realtime is Enabled

**Run in Supabase SQL Editor:**

```sql
-- Check if assignments table is in the realtime publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**Expected Result:**
```
schemaname | tablename
-----------+-----------
public     | assignments
public     | rooms
public     | room_students
```

**If assignments is NOT listed:**
```sql
-- Enable Realtime for assignments
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
```

---

### Step 2: Check Student Portal Console Logs

**Open Student Portal in Browser:**
1. Open student's presigned URL
2. Press `F12` to open DevTools
3. Go to `Console` tab

**Expected Console Messages:**
```
Initializing Supabase client...
Supabase URL: https://lfsmtsnakdaukxgrqynk.supabase.co
✅ Supabase client initialized
Setting up Realtime subscription for student: [student-id]
Monitoring rooms: [room-id-1, room-id-2]
Realtime subscription status: SUBSCRIBED
✅ Successfully subscribed to assignment changes!
```

**If you see:**
```
❌ Error subscribing to assignment changes
```
→ Check that migration-realtime.sql was run

**If you see:**
```
⏱️ Subscription timed out
```
→ Check internet connection and Supabase project status

---

### Step 3: Check Network WebSocket Connection

**In Browser DevTools:**
1. Go to `Network` tab
2. Click `WS` filter (WebSocket)
3. Refresh student portal page

**Expected:**
- You should see connection to `*.supabase.co`
- Status: `101 Switching Protocols` (green)
- Connection stays open (not closing)

**If WebSocket is NOT connecting:**
- Check firewall/proxy settings
- Try different network
- Verify Supabase project is not paused

---

### Step 4: Test Assignment Creation

**Setup (2 Machines/Windows):**

**Window 1 - Student Portal:**
```
1. Open incognito window
2. Paste student access URL
3. Open Console (F12)
4. Watch for messages
```

**Window 2 - Teacher Dashboard:**
```
1. Login as teacher
2. Go to Assignments page
3. Prepare to create assignment
```

**Execute Test:**
```
Teacher: Create assignment for student's room
Student Console should show:
  → "Assignment INSERT detected: {...}"
  → "New assignment for student! Adding to list..."
  → Toast notification appears
  → Assignment card appears in UI
```

**If nothing happens:**
```
Check Console for:
  → "Assignment INSERT detected: {...}"
  
If NOT showing:
  - Realtime not enabled on database
  - WebSocket not connected
  - Run migration-realtime.sql
  
If showing "ignoring" message:
  - Assignment created for different room
  - Student not assigned to that room
  - Check room_id matches
```

---

### Step 5: Verify Student's Room Assignment

**Check in Supabase Database:**

```sql
-- Get student's rooms
SELECT rs.room_id, r.name 
FROM room_students rs
JOIN rooms r ON r.id = rs.room_id
WHERE rs.student_id = '[student-id]';
```

**Then check if assignment is for one of those rooms:**

```sql
-- Check assignment's room
SELECT id, title, room_id 
FROM assignments 
WHERE id = '[assignment-id]';
```

**The room_id must match!**

---

### Step 6: Check Realtime Indicator

**On Student Portal:**
- Look at top right corner
- Should show: 🟢 "Live Updates Active"

**If showing "Connecting...":**
- WebSocket hasn't connected yet
- Wait a few seconds
- Check console for errors

---

## 🔧 Common Fixes

### Fix 1: Realtime Not Enabled

**Problem:** WebSocket connects but no events received

**Solution:**
```sql
-- Run in Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_students;
```

**Verify:**
```sql
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

---

### Fix 2: WebSocket Not Connecting

**Problem:** "Connecting..." never changes to "Live Updates Active"

**Solutions:**
1. **Check Supabase project status**
   - Go to Supabase Dashboard
   - Ensure project is not paused
   - Check project health

2. **Clear browser cache**
   ```
   Ctrl+Shift+Delete
   Clear cached data
   Refresh page
   ```

3. **Try different browser**
   - Test in Chrome
   - Test in Firefox
   - Rule out browser issue

4. **Check network**
   - Disable VPN if active
   - Try different network
   - Check firewall settings

---

### Fix 3: Student Not in Room

**Problem:** Events detected but "ignoring" message shown

**Solution:**
```sql
-- Assign student to room
INSERT INTO room_students (room_id, student_id)
VALUES ('[room-id]', '[student-id]');
```

**Verify:**
```sql
SELECT * FROM room_students 
WHERE student_id = '[student-id]';
```

---

### Fix 4: Supabase Client Issue

**Problem:** Console shows Supabase errors

**Solution:**
1. Check environment variables:
   ```
   VITE_SUPABASE_URL=https://lfsmtsnakdaukxgrqynk.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=[your-key]
   ```

2. Rebuild frontend:
   ```bash
   npm run build
   ```

3. Clear browser cache and reload

---

## 📊 Diagnostic Checklist

Use this checklist to verify everything:

- [ ] `migration-realtime.sql` executed in Supabase
- [ ] `assignments` table in `supabase_realtime` publication
- [ ] Student portal shows "Live Updates Active" (green dot)
- [ ] WebSocket connection in Network tab (101 status)
- [ ] Console shows "✅ Successfully subscribed"
- [ ] Student assigned to at least one room
- [ ] Assignment created for student's room
- [ ] Console shows "Assignment INSERT detected"
- [ ] Toast notification appears
- [ ] Assignment card appears in list

---

## 🧪 Quick Test Script

**Run this in Student Portal Console (F12):**

```javascript
// Check if Realtime is working
console.log('Testing Realtime...');
console.log('Student Data:', window.studentData);
console.log('Supabase Client:', window.supabaseClient);

// Listen for next assignment event
console.log('Waiting for assignment event...');
console.log('Create an assignment in teacher dashboard now!');
```

Then create assignment in teacher dashboard and watch console.

---

## 📞 Still Not Working?

If you've tried everything above and it's still not working:

1. **Check Supabase Dashboard:**
   - Go to Database > Replication
   - Verify "Realtime" is enabled
   - Check table is published

2. **Check Browser Console for errors:**
   - Any red error messages?
   - Any warnings about WebSocket?
   - Screenshot and review

3. **Try Minimal Test:**
   - Create new student
   - Assign to new room
   - Create assignment for that room
   - Watch student portal

4. **Restart Everything:**
   ```bash
   # Stop dev server
   Ctrl+C
   
   # Clear node modules
   rm -rf node_modules
   npm install
   
   # Restart
   npm run dev
   ```

---

## ✅ Success Indicators

**You know it's working when:**

1. ✅ Green dot shows "Live Updates Active"
2. ✅ Console: "Successfully subscribed"
3. ✅ Create assignment → Toast appears < 1 second
4. ✅ Assignment appears in list automatically
5. ✅ No page refresh needed
6. ✅ Works on different machines/browsers

---

## 🎯 Key Console Messages

**Good Messages:**
```
✅ Supabase client initialized
✅ Successfully subscribed to assignment changes!
Assignment INSERT detected: {...}
New assignment for student! Adding to list...
```

**Bad Messages:**
```
❌ Error subscribing to assignment changes
⏱️ Subscription timed out
Assignment not for student rooms, ignoring
```

---

## 💡 Pro Tips

1. **Always have Console open** when debugging
2. **Test on same machine first** (incognito) before different machines
3. **Check one thing at a time** using checklist
4. **Keep teacher and student windows side-by-side**
5. **Wait 2-3 seconds** after creating assignment (network delay)

---

**Most common issue:** Migration not run. Solution: Run `migration-realtime.sql` in Supabase!
