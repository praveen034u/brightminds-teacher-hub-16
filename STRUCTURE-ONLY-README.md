# ✅ Database Structure Fix - Application-Only Approach

## What This Script Does

**File:** `CREATE-TABLES-STRUCTURE-ONLY.sql`

This script ONLY modifies database structure:
- ✅ Adds missing columns
- ✅ Creates foreign key constraints
- ✅ Creates indexes for performance
- ✅ Sets up RLS policies
- ❌ NO data insertion
- ❌ NO data updates
- ❌ NO deletes

## What Gets Fixed

### 1. `question_papers` Table
**Added Columns:**
- `grade` (VARCHAR 50)
- `subject` (VARCHAR 100)
- `description` (TEXT)
- `total_marks` (INTEGER)

**Indexes Created:**
- `idx_question_papers_teacher_id`
- `idx_question_papers_grade`
- `idx_question_papers_subject`
- `idx_question_papers_created_at`

---

### 2. `assignments` Table
**Added Columns:**
- `question_paper_id` (UUID) ⭐ **This is the key column!**
- `assignment_type` (VARCHAR 50)
- `grade` (VARCHAR 50)
- `room_id` (UUID)
- `game_config` (JSONB)

**Foreign Key:**
- `question_paper_id` → `question_papers.id`
- ON DELETE SET NULL (if question paper deleted, assignment stays)

**Indexes Created:**
- `idx_assignments_question_paper_id` ⭐ **For fast lookups**
- `idx_assignments_assignment_type`
- `idx_assignments_grade`
- `idx_assignments_room_id`
- `idx_assignments_status`
- `idx_assignments_teacher_id`
- `idx_assignments_created_at`
- `idx_assignments_due_date`

---

### 3. `assignment_attempts` Table
**Creates Table** (if doesn't exist)

**Columns:**
- `id` (UUID, primary key)
- `assignment_id` (UUID, foreign key)
- `student_id` (VARCHAR)
- `status` (VARCHAR)
- `score` (DECIMAL)
- `answers` (JSONB)
- `started_at` (TIMESTAMP)
- `submitted_at` (TIMESTAMP)

**Constraints:**
- Unique index on (assignment_id, student_id)
- Foreign key to assignments table

---

### 4. `students` Table
**Added Columns:**
- `grade` (VARCHAR 50)
- `primary_language` (VARCHAR 100)

---

### 5. RLS Policies
**Enabled:** Row Level Security on all tables
**Policy:** Permissive (allows all operations) for development

---

## How to Use

### Step 1: Run the Script
1. Open **Supabase SQL Editor**
2. Copy entire content of `CREATE-TABLES-STRUCTURE-ONLY.sql`
3. Paste into SQL Editor
4. Click **"Run"**
5. Wait for completion

### Step 2: Verify
Check the verification queries at the end of the script output:
- Should show all columns exist
- Should show foreign key constraints
- Should show indexes created

### Step 3: Use Your Application
Now create data through your application:

**A. Create Question Paper:**
1. Go to Question Papers page
2. Create new question paper
3. Add questions
4. Save

**B. Create Assignment:**
1. Go to Assignments page
2. Click Create Assignment
3. **Important:** Select "Custom Assignment" tab
4. Select the question paper from dropdown
5. Fill in details
6. Save

**The `question_paper_id` will now be saved!** ✅

---

## Why It Will Work Now

### Before:
```
assignments table:
❌ question_paper_id column doesn't exist
❌ Application tries to save → ERROR
```

### After:
```
assignments table:
✅ question_paper_id column exists (UUID)
✅ Foreign key constraint to question_papers
✅ Index for fast queries
✅ Application saves → SUCCESS
```

---

## Testing After Running Script

### 1. Check Column Exists
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'assignments' 
  AND column_name = 'question_paper_id';
```
**Expected:** Returns `question_paper_id`

### 2. Check Foreign Key
```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'assignments' 
  AND constraint_type = 'FOREIGN KEY';
```
**Expected:** Returns `fk_assignments_question_paper_id`

### 3. Create Assignment via Application
- Open browser console (F12)
- Create assignment
- Look for: `Creating assignment with data:`
- Check if `question_paper_id` has a UUID value
- Should NOT be null!

### 4. Verify in Database
```sql
SELECT id, title, question_paper_id 
FROM assignments 
ORDER BY created_at DESC 
LIMIT 5;
```
**Expected:** `question_paper_id` column has UUID values (not NULL)

---

## What Happens Next

1. **Run this script** → Database structure is fixed
2. **Application creates question paper** → Saved in `question_papers` table
3. **Application creates assignment** → `question_paper_id` is saved in `assignments` table
4. **Student clicks Start Assignment** → Modal opens with questions
5. **Student submits answers** → Score saved in `assignment_attempts` table

---

## Safe to Run

This script is safe because:
- ✅ Uses `IF NOT EXISTS` everywhere
- ✅ Won't break existing data
- ✅ Won't duplicate columns
- ✅ Won't create duplicate constraints
- ✅ Can be run multiple times safely
- ✅ Only adds structure, no data manipulation

---

## If Something Goes Wrong

### Check Script Output
Look for errors in the SQL output. Common issues:

**Error: "relation already exists"**
→ Table already exists, that's fine! Script continues.

**Error: "column already exists"**
→ Column already exists, that's fine! Script continues.

**Error: "constraint already exists"**
→ Constraint already exists, that's fine! Script continues.

### Verify Foreign Key Works
```sql
-- Try to insert invalid reference (should fail)
INSERT INTO assignments (id, title, question_paper_id)
VALUES (uuid_generate_v4(), 'Test', 'invalid-uuid-that-does-not-exist');

-- Expected: ERROR: foreign key violation
-- This proves the constraint works!
```

---

## Success Criteria

After running script and creating data via application:

- [ ] Script runs without critical errors
- [ ] `question_paper_id` column exists in assignments table
- [ ] Foreign key constraint exists
- [ ] Can create question papers via application
- [ ] Can create assignments via application
- [ ] `question_paper_id` is saved (not null) in database
- [ ] Student portal opens modal when clicking "Start Assignment"
- [ ] Questions are displayed in modal
- [ ] Can submit answers and get score

---

## One Command to Rule Them All

```bash
# Just run this file in Supabase SQL Editor:
CREATE-TABLES-STRUCTURE-ONLY.sql
```

That's it! No manual INSERT or UPDATE needed. 
Everything else comes from your application! 🚀
