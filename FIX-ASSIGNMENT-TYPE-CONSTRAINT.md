# 🚨 FIX: Assignment Type Constraint Error

## The Error
```
Database insert failed: new row for relation "assignments" violates check constraint "assignments_assignment_type_check" (Code: 23514)
```

## Root Cause
The `assignments` table has a CHECK constraint that only allows specific values for `assignment_type` column. Currently it probably only allows:
- `'room'` ✅
- `'game'` ✅

But you're trying to insert `'custom'` ❌ which is not in the allowed list.

## Solution: Update the Database Constraint

### Option 1: Drop and Recreate the Constraint (RECOMMENDED)

Run this SQL in Supabase SQL Editor:

```sql
-- Step 1: Drop the old constraint
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;

-- Step 2: Add new constraint with 'custom' allowed
ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check 
CHECK (assignment_type IN ('room', 'game', 'custom'));

-- Step 3: Verify the constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'assignments'::regclass
AND conname = 'assignments_assignment_type_check';
```

**Expected Result:**
```
constraint_definition: CHECK ((assignment_type = ANY (ARRAY['room'::text, 'game'::text, 'custom'::text])))
```

---

### Option 2: If You Want Even More Flexibility

If you want to allow ANY value for assignment_type (not recommended but possible):

```sql
-- Drop the constraint entirely (allows any value)
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;
```

---

## After Running the SQL

1. **Refresh your browser** (F5)
2. **Try creating the custom assignment again**
3. **Expected**: Assignment creates successfully! ✅
4. **Verify in database**:
   ```sql
   SELECT id, title, assignment_type, question_paper_id 
   FROM assignments 
   WHERE assignment_type = 'custom'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

---

## Why This Happened

The original database schema was designed when only 'room' and 'game' assignments existed. Now you're adding a new assignment type 'custom' for question paper-based assignments, so the constraint needs to be updated to allow this new value.

---

## Quick Fix (30 seconds)

**Just copy and paste this into Supabase SQL Editor:**

```sql
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_assignment_type_check;
ALTER TABLE assignments ADD CONSTRAINT assignments_assignment_type_check 
CHECK (assignment_type IN ('room', 'game', 'custom'));
```

Click **Run** → Wait for "Success" → Try creating assignment again! 🚀
