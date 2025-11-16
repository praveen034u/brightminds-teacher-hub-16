# WebSocket Real-Time Updates - Diagnostic & Fix

## 🔧 Issues Fixed

### 1. **Channel Name Conflicts**
**Problem:** Using same channel name `'student-portal-updates'` for every subscription and reconnection caused conflicts.

**Solution:** Now using unique channel names with timestamp:
```typescript
const channelName = `student-portal-${studentData.id}-${Date.now()}`;
```

### 2. **Improper Channel Cleanup**
**Problem:** Old channels weren't being properly removed before creating new ones.

**Solution:** Added proper async cleanup with delays:
```typescript
await supabaseRef.current.removeChannel(subscriptionRef.current);
subscriptionRef.current = null;
await new Promise(resolve => setTimeout(resolve, 100));
```

### 3. **No Connection Test**
**Problem:** No way to verify if Realtime is actually working.

**Solution:** Added connection test on initialization that logs helpful error messages.

## 🔍 Diagnostic Steps

### Step 1: Check Console Logs
Open student portal and check browser console (F12) for these messages:

#### ✅ **Good Signs:**
```
Initializing Supabase client...
✅ Supabase client initialized
Test channel status: SUBSCRIBED
✅ Realtime is working! Unsubscribing test channel...
Setting up Realtime subscription for student: [id]
Creating channel: student-portal-[id]-[timestamp]
Realtime subscription status: SUBSCRIBED
✅ Successfully subscribed to portal updates!
```

#### ❌ **Bad Signs:**
```
Test channel status: CHANNEL_ERROR
❌ Realtime connection test failed!
This may mean:
1. Realtime is not enabled in Supabase project settings
2. Tables are not added to supabase_realtime publication
3. Network/firewall blocking WebSocket connections
```

### Step 2: Verify Realtime is Enabled in Supabase

**Go to:** Supabase Dashboard > Project Settings > API

**Check:** "Realtime" section should show status as enabled

**Fix if disabled:**
1. Click "Enable Realtime"
2. Save changes

### Step 3: Verify Tables Are in Realtime Publication

**Run this in Supabase SQL Editor:**
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**Expected Result:** Should show these 4 tables:
- `assignments`
- `rooms`
- `room_students`
- `students`

**If missing, run this migration:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_students;
ALTER PUBLICATION supabase_realtime ADD TABLE students;
```

### Step 4: Test Assignment Creation

**Setup:**
1. Open student portal in Browser A (F12 console open)
2. Open teacher dashboard in Browser B

**Test:**
1. In Browser B: Create new assignment for student's room
2. In Browser A: Watch console

**Expected Console Logs:**
```
Assignment INSERT detected: {new: {id: "...", title: "...", ...}}
New assignment for student! Adding to list...
```

**Expected UI:**
- Assignment appears in list (no refresh needed)
- Toast: "New Assignment: [title]"

### Step 5: Test Student Addition

**Setup:**
1. Student A portal open in Browser A (F12 console open)
2. Teacher dashboard in Browser B

**Test:**
1. In Browser B: Create Student B, assign to same room as Student A
2. In Browser A: Watch console

**Expected Console Logs:**
```
room_students change detected: {new: {student_id: "...", room_id: "..."}}
Event type: INSERT
Room assignment change detected! Reloading student data...
```

**Expected UI:**
- Toast: "A new classmate joined your classroom"
- Student B appears in "My Classmates" section

## 🐛 Common Issues & Solutions

### Issue: "Test channel status: CHANNEL_ERROR"

**Diagnosis:** Realtime not properly configured

**Solutions:**
1. Check Supabase project is not paused
2. Enable Realtime in project settings
3. Run migration to add tables to publication
4. Check browser console for WebSocket errors
5. Try different network (corporate firewalls may block WebSockets)

### Issue: Green dot appears, but no events received

**Diagnosis:** Tables not in Realtime publication

**Solution:**
```sql
-- Run in Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_students;
ALTER PUBLICATION supabase_realtime ADD TABLE students;

-- Verify
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### Issue: "Cannot setup subscription: missing studentData or supabase client"

**Diagnosis:** Subscription attempting before data loaded

**Solution:** This is normal - the subscription will retry once data loads. If it persists:
1. Check token is valid
2. Check student-portal Edge Function is deployed
3. Verify student exists in database

### Issue: Events received but for wrong rooms

**Diagnosis:** Filtering logic issue

**Check Console:** Should see:
```
Assignment not for student rooms, ignoring
room_students change not relevant, ignoring
```

This is correct - filtering is working.

### Issue: Duplicate assignments appearing

**Check Console:** Should see:
```
Assignment already exists, skipping duplicate
```

This is correct - duplicate prevention is working.

## 📊 Testing Checklist

- [ ] Console shows "✅ Realtime is working!"
- [ ] Green pulsing dot appears in student portal
- [ ] Console shows "✅ Successfully subscribed to portal updates!"
- [ ] Creating assignment triggers INSERT event
- [ ] Assignment appears without page refresh
- [ ] Toast notification appears
- [ ] Adding student to room triggers room_students event
- [ ] Classmates section updates
- [ ] No duplicate assignments

## 🔬 Advanced Debugging

### Enable Verbose Logging

Add to browser console:
```javascript
localStorage.setItem('supabase.realtime.log_level', 'debug')
```

Reload page and check console for detailed WebSocket logs.

### Check WebSocket Connection

In browser DevTools:
1. Go to Network tab
2. Filter by "WS" (WebSocket)
3. Look for connection to Supabase Realtime
4. Should show status 101 (Switching Protocols)
5. Messages tab should show ping/pong frames

### Manual Test Query

```sql
-- Insert a test assignment
INSERT INTO assignments (title, description, room_id, status, due_date)
VALUES ('Test Assignment', 'Testing real-time', '[room-id]', 'active', NOW() + INTERVAL '1 day');
```

Should trigger event in student portal immediately.

## 🎯 Quick Fixes

### Reset Everything
```javascript
// Run in student portal console
window.location.reload()
```

### Force Reconnect
Just switch to another tab and back - the visibility handler will reconnect.

### Check Connection Status
Look for the dot in top-right:
- 🟢 Green pulsing = Connected
- ⚪ Gray = Not connected

## 📝 What Changed in Code

### New Features:
1. ✅ Unique channel names (prevents conflicts)
2. ✅ Connection test on startup
3. ✅ Better async cleanup
4. ✅ Detailed error messages
5. ✅ Proper channel removal before reconnection

### Improved Logging:
- Shows channel name being created
- Logs when removing old channels
- Shows reconnection attempts clearly
- Test channel provides diagnostic info

## 🚀 Next Steps

1. **Run the migration** (if not already done):
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
   ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
   ALTER PUBLICATION supabase_realtime ADD TABLE room_students;
   ALTER PUBLICATION supabase_realtime ADD TABLE students;
   ```

2. **Open student portal** and check console for connection test results

3. **Look for green dot** in top-right corner

4. **Test** by creating an assignment

5. **Check console logs** to verify events are being received

If you still see issues after following all steps, check the console logs and share them for further debugging.
