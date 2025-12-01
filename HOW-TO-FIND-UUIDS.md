# 📋 How to Find UUIDs - Visual Guide

## What is a UUID?

A UUID (Universally Unique Identifier) looks like this:
```
abc12345-1234-5678-90ab-cdef12345678
```

It's a long string with dashes that uniquely identifies each row in your database.

---

## 🎯 Quick Method - 3 Simple Steps

### Step 1: Open Supabase
1. Go to https://supabase.com
2. Log in to your project
3. Click **"Table Editor"** in the left sidebar

### Step 2: View Your Tables

#### Option A: Find Question Paper UUIDs
1. Click on **`question_papers`** table
2. Look at the **`id`** column (first column)
3. Each row has a UUID - that's your `QUESTION_PAPER_UUID`
4. **Right-click** on a UUID → **Copy**

![Table view example]
```
┌──────────────────────────────────────┬──────────────┬─────────┐
│ id (this is the UUID!)               │ title        │ grade   │
├──────────────────────────────────────┼──────────────┼─────────┤
│ abc12345-1234-5678-90ab-cdef12345678 │ Math Quiz    │ Grade 8 │
│ def67890-5678-1234-cdef-123456789abc │ Science Test │ Grade 9 │
└──────────────────────────────────────┴──────────────┴─────────┘
    👆 COPY THIS!
```

#### Option B: Find Assignment UUIDs
1. Click on **`assignments`** table
2. Look at the **`id`** column (first column)
3. Each row has a UUID - that's your `ASSIGNMENT_UUID`
4. **Right-click** on a UUID → **Copy**

```
┌──────────────────────────────────────┬──────────────────┬──────────────────┐
│ id (this is the UUID!)               │ title            │ question_paper_id│
├──────────────────────────────────────┼──────────────────┼──────────────────┤
│ xyz12345-9999-8888-7777-666655554444 │ Week 1 Homework  │ NULL             │
│ uvw67890-1111-2222-3333-444455556666 │ Practice Test    │ NULL             │
└──────────────────────────────────────┴──────────────────┴──────────────────┘
    👆 COPY THIS!                                              👆 These are NULL!
                                                                   Need to fix!
```

### Step 3: Use the UUIDs
Now that you have both UUIDs, use them in SQL:

```sql
UPDATE assignments 
SET question_paper_id = 'PASTE_YOUR_QUESTION_PAPER_UUID_HERE'
WHERE id = 'PASTE_YOUR_ASSIGNMENT_UUID_HERE';
```

**Real example:**
```sql
UPDATE assignments 
SET question_paper_id = 'abc12345-1234-5678-90ab-cdef12345678'
WHERE id = 'xyz12345-9999-8888-7777-666655554444';
```

---

## 🔍 Alternative Method - Using SQL

If you prefer SQL, run this in **SQL Editor**:

### 1. Find Question Paper UUIDs
```sql
SELECT id, title FROM question_papers ORDER BY created_at DESC;
```

**Results will look like:**
```
id                                   | title
-------------------------------------|-------------
abc12345-1234-5678-90ab-cdef12345678 | Math Quiz
def67890-5678-1234-cdef-123456789abc | Science Test
```
☝️ Copy the `id` value

### 2. Find Assignment UUIDs
```sql
SELECT id, title, question_paper_id 
FROM assignments 
WHERE question_paper_id IS NULL;
```

**Results will look like:**
```
id                                   | title           | question_paper_id
-------------------------------------|-----------------|------------------
xyz12345-9999-8888-7777-666655554444 | Week 1 Homework | NULL
uvw67890-1111-2222-3333-444455556666 | Practice Test   | NULL
```
☝️ Copy the `id` value

### 3. Link Them
```sql
UPDATE assignments 
SET question_paper_id = 'abc12345-1234-5678-90ab-cdef12345678'
WHERE id = 'xyz12345-9999-8888-7777-666655554444';
```

---

## 📸 Screenshot Guide

### In Supabase Table Editor:

1. **Left sidebar** → Click "Table Editor"
2. **Top dropdown** → Select table (`question_papers` or `assignments`)
3. **First column** → That's the `id` (UUID)
4. **Right-click** on any UUID → "Copy"
5. **Paste** into your SQL UPDATE statement

---

## 🎓 Understanding the Link

Think of it like this:

```
Question Paper (Has questions)
   ↓
   │ (connected by question_paper_id)
   ↓
Assignment (Students see this)
```

**Before linking:**
```
Question Paper: "Math Quiz" (id: abc-123...)
Assignment: "Week 1" (question_paper_id: NULL) ❌
```

**After linking:**
```
Question Paper: "Math Quiz" (id: abc-123...)
Assignment: "Week 1" (question_paper_id: abc-123...) ✅
```

---

## ✅ Quick Checklist

- [ ] I opened Supabase Table Editor
- [ ] I found the `question_papers` table
- [ ] I copied a `question_paper_id` (the `id` column)
- [ ] I found the `assignments` table
- [ ] I copied an `assignment_id` (the `id` column)
- [ ] I pasted both UUIDs into the UPDATE statement
- [ ] I ran the UPDATE in SQL Editor
- [ ] I verified it worked (question_paper_id is no longer NULL)

---

## 🆘 What if I Don't See Any UUIDs?

### If `question_papers` table is empty:
**Problem:** You haven't created any question papers yet!

**Solution:**
1. Go to the **Question Papers** page in your app
2. Click **"Create Question Paper"**
3. Add some questions
4. Save it
5. Come back and run the SQL again - you'll see a UUID!

### If `assignments` table is empty:
**Problem:** You haven't created any assignments yet!

**Solution:**
1. Go to the **Assignments** page in your app
2. Click **"Create Assignment"**
3. Fill in the form (but it won't have question papers yet)
4. Save it
5. Now link it using the SQL UPDATE

---

## 🎯 Pro Tip: Use the Auto-Generated Script

I created a file called **`FIND-YOUR-UUIDS.sql`** that does all of this for you!

Just run it in Supabase SQL Editor and it will:
- ✅ Show you all question paper UUIDs
- ✅ Show you all assignment UUIDs that need linking
- ✅ Give you a template with both UUIDs ready to use
- ✅ Verify it worked after you run the UPDATE

---

## Example Walkthrough

Let's say you run the SQL and see:

**Question Papers:**
```
id                                   | title
-------------------------------------|-------------
aaa111-2222-3333-4444-555566667777  | Math Quiz
bbb888-9999-0000-1111-222233334444  | English Test
```

**Assignments (needing links):**
```
id                                   | title
-------------------------------------|------------------
ccc555-6666-7777-8888-999900001111  | Week 1 Assignment
ddd222-3333-4444-5555-666677778888  | Week 2 Assignment
```

**To link "Week 1 Assignment" to "Math Quiz":**
```sql
UPDATE assignments 
SET question_paper_id = 'aaa111-2222-3333-4444-555566667777'
WHERE id = 'ccc555-6666-7777-8888-999900001111';
```

**To link "Week 2 Assignment" to "English Test":**
```sql
UPDATE assignments 
SET question_paper_id = 'bbb888-9999-0000-1111-222233334444'
WHERE id = 'ddd222-3333-4444-5555-666677778888';
```

Done! 🎉

---

## Need Help?

If you're still stuck, share a screenshot of your Supabase Table Editor showing:
1. The `question_papers` table
2. The `assignments` table

And I'll tell you exactly which UUIDs to use!
