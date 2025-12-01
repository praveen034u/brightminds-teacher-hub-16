# 🎯 COMPLETE FIX GUIDE - Assignment Creation Error

## 🚨 The Error You're Seeing

```
Database insert failed: new row for relation "assignments" violates check constraint "assignments_assignment_type_check" (Code: 23514)
```

**Translation:** The database is rejecting `assignment_type = 'custom'` because it's not in the allowed values list.

---

## ✅ What's Working

Your frontend is PERFECT! ✨
- Question paper created successfully ✅
- UUID validation working ✅
- Sending correct data to backend ✅
- `assignment_type = 'custom'` ✅
- `question_paper_id = '69f5b3f1-f258-45b6-9bef-7337568b7535'` ✅

**The only issue:** Database constraint needs updating!

---

## 🔧 THE FIX (30 seconds)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New query**

### Step 2: Copy and Paste This SQL

```sql
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check 
CHECK (assignment_type IN ('room', 'game', 'custom'));
```

### Step 3: Run It
1. Click the **Run** button
2. Wait for: `Success. No rows returned.`
3. **Done!** ✅

---

## 🧪 Test It

### After running the SQL:

1. **Refresh your browser** (F5)
2. **Go to Assignments page**
3. **Create Assignment → Custom Assignment tab**
4. **Select your question paper**
5. **Fill in the details**
6. **Click "Create Assignment"**
7. **Expected:** ✅ "Assignment created successfully!"

### Verify in Database

Run this in SQL Editor:
```sql
SELECT 
    id, 
    title, 
    assignment_type, 
    question_paper_id,
    created_at
FROM assignments 
WHERE assignment_type = 'custom'
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:** You should see your custom assignment(s)! 🎉

---

## 📊 What This Does

### Before:
```
assignment_type CHECK constraint allows: ['room', 'game']
Your data: 'custom' ❌ REJECTED
```

### After:
```
assignment_type CHECK constraint allows: ['room', 'game', 'custom']
Your data: 'custom' ✅ ACCEPTED
```

---

## 🎯 Next Steps After Fix

Once the constraint is updated:

### 1. Create Assignment ✅
- Frontend sends: `assignment_type = 'custom'`, `question_paper_id = <UUID>`
- Backend saves to database successfully
- Assignment appears in assignments list

### 2. Student Portal Testing 🎓
- Student logs in
- Sees assignment in their list
- Clicks "Start Assignment"
- **Modal opens with questions!** 🎉

### 3. Full Workflow Success 🚀
```
Teacher: Create Question Paper → Create Assignment
         ↓
Database: Saves with correct types
         ↓
Student: Start Assignment → Modal opens
         ↓
Student: Answers questions → Submit
         ↓
Database: Saves attempt with score
         ↓
Teacher: Views progress → Sees completion!
```

---

## 🐛 If It Still Doesn't Work

Check these in SQL Editor:

**1. Verify constraint updated:**
```sql
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint
WHERE conrelid = 'assignments'::regclass
AND conname = 'assignments_assignment_type_check';
```

**Should return:**
```
CHECK ((assignment_type = ANY (ARRAY['room'::text, 'game'::text, 'custom'::text])))
```

**2. Check if Edge Function is deployed:**
The Edge Function code was fixed but not deployed yet. If you still see issues after fixing the constraint, you may need to deploy the Edge Function.

---

## 📝 Summary

**Issue:** Database constraint too restrictive
**Fix:** Update constraint to allow 'custom' type
**Time:** 30 seconds
**Impact:** Enables custom assignments with question papers! 🎉

**Run this now:**
```sql
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check 
CHECK (assignment_type IN ('room', 'game', 'custom'));
```

Then test creating an assignment! 🚀
