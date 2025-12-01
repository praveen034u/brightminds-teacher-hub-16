# 🚨 FIX: "Failed to load teacher profile" Error

## ❌ The Error You're Seeing

```
Failed to load teacher profile
```

**When it happens**: When you navigate to Question Papers page

**Console shows**:
```
📋 Getting teacher UUID for auth0_user_id: auth0|6922a18930a0f585e7640eff
❌ Error getting teacher UUID: {...}
❌ No teacher found for auth0_user_id: auth0|6922a18930a0f585e7640eff
```

---

## 🔍 Root Cause

The code is looking for a teacher record in the `teachers` table with your `auth0_user_id`, but it doesn't exist!

**Query being run:**
```sql
SELECT id FROM teachers WHERE auth0_user_id = 'auth0|6922a18930a0f585e7640eff';
-- Returns: Empty (0 rows)
```

---

## ✅ IMMEDIATE FIX

### Step 1: Check if Teacher Exists

**Open Supabase SQL Editor and run:**

```sql
SELECT id, email, auth0_user_id 
FROM teachers 
WHERE auth0_user_id = 'auth0|6922a18930a0f585e7640eff';
```

**Expected results:**
- **If returns a row**: Teacher exists, different issue
- **If returns empty**: Teacher doesn't exist, need to create

---

### Step 2A: If Teacher Doesn't Exist - Create It

**Run this in Supabase SQL Editor** (update values as needed):

```sql
INSERT INTO teachers (
  id,
  auth0_user_id,
  email,
  full_name,
  school_name,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'auth0|6922a18930a0f585e7640eff',  -- Your auth0 user ID from console
  'lalit_test@gmail.com',             -- Your actual email
  'Lalit Test User',                   -- Your name
  'BrightMinds School',                -- Your school
  now(),
  now()
);
```

**Verify it was created:**
```sql
SELECT id, email, auth0_user_id FROM teachers WHERE email = 'lalit_test@gmail.com';
```

Should return 1 row with your teacher data! ✅

---

### Step 2B: If Teacher Exists - Check RLS Policies

If teacher record exists but still getting error, RLS policies might be blocking access.

**Run this to check:**
```sql
-- Disable RLS temporarily for testing
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;

-- Try selecting again
SELECT id FROM teachers WHERE auth0_user_id = 'auth0|6922a18930a0f585e7640eff';

-- Re-enable RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
```

**If this works**: RLS policy issue
**If still fails**: Different problem

---

## 🎯 After Creating Teacher Record

### Step 1: Refresh Browser
Press **Ctrl+R** or **F5**

### Step 2: Check Console
Should show:
```
📋 Getting teacher UUID for auth0_user_id: auth0|6922a18930a0f585e7640eff
✅ Teacher UUID: fb23a095-fe7b-4495-8b85-761648f42fbe
📄 Loading question papers for teacher UUID: fb23a095-fe7b-...
✅ Loaded question papers from database: 0
```

### Step 3: Test Question Paper Creation
1. **Click** "Create Question Paper"
2. **Should see**: Form loads (not error)
3. **Fill and save**: Should work! ✅

---

## 📋 Why This Happened

**Possible reasons:**
1. **New installation**: Teachers table is empty
2. **Auth0 signup**: User created in Auth0 but not in database
3. **Migration issue**: Old data didn't include teacher records
4. **Manual testing**: Using test account that wasn't set up

**Solution**: Create teacher record manually or via signup flow

---

## 🔧 Better Error Handling Added

**Before:**
```typescript
if (teacherError || !teacherData) {
  toast.error('Failed to load teacher profile');
  return;  // ❌ Stops completely
}
```

**After:**
```typescript
if (teacherError) {
  console.error('❌ Error getting teacher UUID:', teacherError);
  console.error('❌ Error details:', JSON.stringify(teacherError, null, 2));
}

if (!teacherData) {
  console.error('❌ No teacher found for auth0_user_id:', auth0UserId);
  console.log('💡 TIP: Check if teacher record exists in database');
  console.log('💡 Run this SQL: SELECT id FROM teachers WHERE auth0_user_id = \'' + auth0UserId + '\';');
  toast.error('Teacher profile not found. Please contact support.');
  return;
}
```

Now shows helpful debugging info in console! 🎉

---

## 📊 Complete Diagnostic Flow

### Step 1: Check Browser Console
Look for these messages after refreshing:

**Good sign ✅:**
```
📋 Getting teacher UUID for auth0_user_id: auth0|6922a18930a0f585e7640eff
✅ Teacher UUID: fb23a095-fe7b-4495-8b85-761648f42fbe
```

**Bad sign ❌:**
```
📋 Getting teacher UUID for auth0_user_id: auth0|6922a18930a0f585e7640eff
❌ Error getting teacher UUID: {...}
❌ No teacher found for auth0_user_id: auth0|6922a18930a0f585e7640eff
💡 TIP: Check if teacher record exists in database
💡 Run this SQL: SELECT id FROM teachers WHERE auth0_user_id = 'auth0|6922a18930a0f585e7640eff';
```

### Step 2: Run Diagnostic SQL
I've created: **`CHECK-TEACHER-EXISTS.sql`**

Open it and run each query in Supabase SQL Editor:
1. Check all teachers
2. Check for your specific auth0_user_id
3. See table schema
4. Create teacher if missing
5. Verify creation

### Step 3: Verify Fix
After creating teacher:
1. Refresh browser
2. Go to Question Papers page
3. Should load without error ✅

---

## 🚀 Quick Fix Steps (30 seconds)

**1. Open Supabase SQL Editor**

**2. Copy/paste this (update email):**
```sql
INSERT INTO teachers (
  id, auth0_user_id, email, full_name, school_name, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'auth0|6922a18930a0f585e7640eff',
  'lalit_test@gmail.com',
  'Lalit Test',
  'BrightMinds School',
  now(),
  now()
);
```

**3. Click Run**

**4. Refresh browser**

**5. Try Question Papers page again**

**Done!** ✅

---

## 💡 Common Issues

### Issue 1: "duplicate key value violates unique constraint"
**Means**: Teacher already exists with that auth0_user_id
**Solution**: Check if email is different
```sql
SELECT * FROM teachers WHERE auth0_user_id = 'auth0|6922a18930a0f585e7640eff';
```

### Issue 2: "permission denied for table teachers"
**Means**: RLS policy blocking insert
**Solution**: 
```sql
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
-- Run INSERT again
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
```

### Issue 3: Still getting error after creating teacher
**Means**: Might be caching issue
**Solution**: 
- Hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Open in incognito mode

---

## 📁 Files Created

1. **`CHECK-TEACHER-EXISTS.sql`** - Diagnostic SQL queries
2. **`FIX-TEACHER-PROFILE-ERROR.md`** - This guide

---

## 🎯 Expected Outcome

**After fix:**
- ✅ No "Failed to load teacher profile" error
- ✅ Question Papers page loads
- ✅ Can create question papers
- ✅ Console shows teacher UUID
- ✅ Everything works!

---

## 💬 Next Steps

1. **Run**: `CHECK-TEACHER-EXISTS.sql` queries
2. **Create**: Teacher record if missing
3. **Refresh**: Browser
4. **Test**: Question Papers page
5. **Report**: Does it work now?

**Send me:**
- Result of the SELECT query (does teacher exist?)
- Any errors from INSERT (if you needed to create)
- Console logs after refresh

Let's get this working! 🚀
