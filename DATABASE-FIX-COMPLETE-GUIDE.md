# 🔧 Complete Database Fix & Fresh Start Guide

## Overview

This guide will help you:
1. ✅ Fix all missing database columns and constraints
2. ✅ Clean existing data (optional)
3. ✅ Insert fresh data from the application
4. ✅ Verify everything works

**Time Required:** 15-20 minutes

---

## Step 1: Fix Database Structure (REQUIRED) ⚙️

### What This Does:
- Adds all missing columns to `question_papers`, `assignments`, `assignment_attempts`, `students`
- Creates all necessary indexes for performance
- Adds foreign key constraints
- Sets up RLS policies
- Verifies the structure

### How to Run:

1. **Open Supabase Dashboard**
2. **Go to SQL Editor** (left sidebar)
3. **Open the file:** `FIX-DATABASE-STRUCTURE.sql`
4. **Click "Run"** (or press Ctrl+Enter)

### Expected Output:
```
✅ Database structure fix complete!
✅ All missing columns added
✅ All indexes created
✅ All foreign keys added
✅ RLS policies configured
🎉 You can now insert fresh data!
```

### What Gets Fixed:

#### `question_papers` table:
- ✅ Adds `grade` column (VARCHAR 50)
- ✅ Adds `subject` column (VARCHAR 100)
- ✅ Adds `description` column (TEXT)
- ✅ Adds `total_marks` column (INTEGER)
- ✅ Creates indexes for better performance

#### `assignments` table:
- ✅ Adds `question_paper_id` column (UUID, FK to question_papers)
- ✅ Adds `assignment_type` column (VARCHAR 50)
- ✅ Adds `grade` column (VARCHAR 50)
- ✅ Adds `room_id` column (UUID)
- ✅ Adds `game_config` column (JSONB)
- ✅ Creates foreign key constraint
- ✅ Creates indexes

#### `assignment_attempts` table:
- ✅ Creates entire table if missing
- ✅ Adds foreign key to assignments
- ✅ Creates unique constraint (one attempt per student per assignment)
- ✅ Creates indexes

#### `students` table:
- ✅ Adds `grade` column
- ✅ Adds `primary_language` column

---

## Step 2: Clean Existing Data (OPTIONAL) 🧹

**⚠️ WARNING:** This will delete data! Only do this if you want a fresh start.

### Option A: Full Cleanup (Start Completely Fresh)

1. **Open:** `CLEAN-EXISTING-DATA.sql`
2. **Uncomment** the DELETE statements in Part 3
3. **Run** the script

This will delete:
- All assignment attempts
- All assignments
- All question papers

**Does NOT delete:**
- Students
- Teachers
- Rooms

### Option B: Selective Cleanup (Recommended)

Instead of deleting, archive old data:

```sql
-- Mark old assignments as archived (doesn't delete)
UPDATE assignments 
SET status = 'archived' 
WHERE status = 'active' 
  AND created_at < NOW() - INTERVAL '30 days';
```

### Option C: Skip Cleanup

If your existing data looks okay, you can skip this step and just add new data!

---

## Step 3: Verify Structure ✅

Run these queries to make sure everything is fixed:

```sql
-- Check question_papers columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'question_papers'
ORDER BY ordinal_position;
```

**Should show:**
- id (uuid)
- teacher_id (varchar)
- title (varchar)
- description (text)
- grade (varchar) ✅ NEW
- subject (varchar) ✅ NEW
- questions (jsonb)
- total_marks (integer) ✅ NEW
- created_at (timestamp)
- updated_at (timestamp)

```sql
-- Check assignments columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assignments'
ORDER BY ordinal_position;
```

**Should show:**
- id (uuid)
- teacher_id (varchar)
- title (varchar)
- description (text)
- grade (varchar) ✅ NEW
- status (varchar)
- due_date (timestamp)
- question_paper_id (uuid) ✅ NEW
- assignment_type (varchar) ✅ NEW
- room_id (uuid) ✅ NEW
- game_config (jsonb) ✅ NEW
- created_at (timestamp)
- updated_at (timestamp)

---

## Step 4: Insert Fresh Data via Application 🎯

Now that the database is fixed, create new data through your application:

### A. Create Question Papers

1. **Go to:** Question Papers page in your app
2. **Click:** "Create Question Paper"
3. **Fill in:**
   - Title: "Math Quiz Grade 8"
   - Description: "Basic arithmetic"
   - Grade: "Grade 8"
   - Subject: "Mathematics"
4. **Add questions** (at least 3)
5. **Click:** "Save Question Paper"
6. **Verify in console:** Check for success message

### B. Create Assignments

1. **Go to:** Assignments page
2. **Click:** "Create Assignment"
3. **Select:** "Custom Assignment" tab (NOT Pre-built)
4. **Fill in:**
   - Title: "Week 1 Math Assignment"
   - Description: "Complete by Friday"
   - Grade: "Grade 8"
   - Due Date: Select a future date
5. **Select:** The question paper you just created
6. **Click:** "Create Assignment"
7. **Verify in console:** Look for `question_paper_id: <UUID>` (not null!)

### C. Verify in Database

```sql
-- Check if question papers were created
SELECT id, title, grade, jsonb_array_length(questions) as question_count
FROM question_papers
ORDER BY created_at DESC
LIMIT 5;
```

```sql
-- Check if assignments are linked
SELECT 
  a.id,
  a.title,
  a.question_paper_id,
  qp.title as question_paper_title
FROM assignments a
LEFT JOIN question_papers qp ON a.question_paper_id = qp.id
WHERE a.status = 'active'
ORDER BY a.created_at DESC
LIMIT 5;
```

**✅ Success if:**
- `question_paper_id` is NOT NULL
- `question_paper_title` shows the name of your question paper

---

## Step 5: Test Student Portal 🧪

Now test if students can see and complete assignments:

### A. Open Student Portal

1. Navigate to student portal page
2. **Open browser console** (F12)
3. **Clear console**
4. **Refresh page**

### B. Check Console Logs

Look for:
```
╔════════════════════════════════════════════════════════════╗
║  🎯 FINAL DATA - What UI Will Receive                     ║
╚════════════════════════════════════════════════════════════╝

✅ Assignment 1: Week 1 Math Assignment
   question_paper_id: abc-123-456-789...
   Will open modal?: ✅ YES
```

**✅ If you see this:** The fix worked!  
**❌ If you see NULL:** Something went wrong in assignment creation

### C. Click "Start Assignment"

1. **Click** the "Start Assignment" button
2. **Console should show:**
   ```
   ✅ CONDITION MET: assignment.question_paper_id EXISTS
   ➡️  CALLING: startAssignmentWithQuestionPaper()
   📄 STEP 1: Loading question paper...
   ✅ Question paper loaded successfully
   🎨 STEP 2: Opening question paper modal...
   ✅ Modal opened with 3 questions
   ```
3. **Modal should open** with questions visible
4. **Answer questions** and submit
5. **Score should be calculated** and shown
6. **Assignment should show** "✅ Submitted"

---

## Step 6: Verify Everything Works 🎉

Run this final verification:

```sql
-- Check complete flow
SELECT 
  qp.title as question_paper,
  a.title as assignment,
  aa.student_id,
  aa.status,
  aa.score,
  aa.submitted_at
FROM question_papers qp
INNER JOIN assignments a ON a.question_paper_id = qp.id
LEFT JOIN assignment_attempts aa ON aa.assignment_id = a.id
WHERE a.status = 'active'
ORDER BY qp.created_at DESC, a.created_at DESC;
```

**✅ Success if you see:**
- Question papers linked to assignments
- Assignment attempts with scores
- Submitted timestamps

---

## Troubleshooting 🔧

### Problem: Columns still missing after running fix script

**Solution:**
```sql
-- Check if script actually ran
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'question_papers' AND column_name = 'grade';
```

If empty, manually run:
```sql
ALTER TABLE question_papers ADD COLUMN grade VARCHAR(50);
ALTER TABLE assignments ADD COLUMN question_paper_id UUID;
```

### Problem: Foreign key constraint error

**Solution:**
```sql
-- Drop existing constraint
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_question_paper_id_fkey;

-- Add it back correctly
ALTER TABLE assignments 
  ADD CONSTRAINT assignments_question_paper_id_fkey 
  FOREIGN KEY (question_paper_id) 
  REFERENCES question_papers(id) 
  ON DELETE SET NULL;
```

### Problem: RLS policy blocks access

**Solution:**
```sql
-- Temporarily disable RLS for debugging
ALTER TABLE question_papers DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;

-- Test if it works
-- Then re-enable and fix policies
```

### Problem: Application not saving question_paper_id

**Check:**
1. Open browser console when creating assignment
2. Look for: `Creating assignment with data:`
3. Check if `question_paper_id` is in the object
4. If null, you selected "Pre-built" instead of "Custom" tab

---

## Quick Reference Commands 📋

### Check table structure:
```sql
\d+ question_papers
\d+ assignments
\d+ assignment_attempts
```

### Count records:
```sql
SELECT COUNT(*) FROM question_papers;
SELECT COUNT(*) FROM assignments;
SELECT COUNT(*) FROM assignment_attempts;
```

### View latest records:
```sql
SELECT * FROM question_papers ORDER BY created_at DESC LIMIT 5;
SELECT * FROM assignments ORDER BY created_at DESC LIMIT 5;
SELECT * FROM assignment_attempts ORDER BY created_at DESC LIMIT 5;
```

### Check links:
```sql
SELECT 
  a.title,
  a.question_paper_id,
  qp.title as paper_title
FROM assignments a
LEFT JOIN question_papers qp ON a.question_paper_id = qp.id
LIMIT 10;
```

---

## Success Criteria ✅

Your database is fully fixed when:

- [ ] `FIX-DATABASE-STRUCTURE.sql` runs without errors
- [ ] All verification queries show expected columns
- [ ] Can create question papers via application
- [ ] Can create assignments and select question papers
- [ ] Database shows `question_paper_id` is NOT NULL
- [ ] Student portal console shows "✅ YES" for "Will open modal?"
- [ ] Modal opens with questions when clicking "Start Assignment"
- [ ] Can submit answers and see scores
- [ ] Database records assignment attempts with scores

---

## Files Created for You 📁

1. **FIX-DATABASE-STRUCTURE.sql** - Run this FIRST to fix all columns
2. **CLEAN-EXISTING-DATA.sql** - Optional cleanup script
3. **SIMPLE-FIND-AND-LINK.sql** - Simple UUID finder (if needed later)
4. **HOW-TO-FIND-UUIDS.md** - Visual guide for finding UUIDs

---

## Next Steps After Fix 🚀

1. ✅ Run `FIX-DATABASE-STRUCTURE.sql`
2. ✅ Verify columns exist
3. ✅ Create fresh question papers via app
4. ✅ Create assignments and link them
5. ✅ Test student portal
6. ✅ Celebrate! 🎉

Your student portal should now work perfectly! 🚀
