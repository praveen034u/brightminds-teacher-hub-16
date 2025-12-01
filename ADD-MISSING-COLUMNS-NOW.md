# 🚨 URGENT: Add Missing Columns to question_papers Table

## ❌ The Error

```
POST .../question_papers 400 (Bad Request)
❌ Database error: "Could not find the 'total_marks' column of 'question_papers' in the schema cache"
```

**Also missing**: `question_count` column

---

## ✅ **IMMEDIATE FIX (30 seconds)**

### **Copy and Run This SQL in Supabase SQL Editor:**

```sql
-- Add missing columns to question_papers table
ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;
ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0;
ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS grade VARCHAR(50);
ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
```

**That's it!** Just run those 4 lines.

---

## 🎯 **How to Run:**

1. **Open Supabase Dashboard** → Your project
2. **Click "SQL Editor"** in left sidebar
3. **Click "New query"**
4. **Copy/paste** the SQL above
5. **Click "Run"** button
6. **Wait for**: "Success. No rows returned"

---

## ✅ **Verify It Worked:**

Run this to check:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'question_papers'
AND column_name IN ('question_count', 'total_marks', 'grade', 'subject');
```

**Expected result**: 4 rows showing the columns exist ✅

---

## 🧪 **Test After Running SQL:**

1. **Refresh your browser** (Ctrl+R)
2. **Go to Question Papers page**
3. **Click "Create Question Paper"**
4. **Fill form** and add 1 question
5. **Click "Save"**
6. **Should see**: "Question paper saved successfully!" ✅

**Console should show:**
```
💾 Saving question paper with teacher_id: fb23a095-fe7b-...
✅ Question paper created successfully in database!
✅ Question paper ID: abc-123-def-...
```

---

## 📊 **Why These Columns Are Needed:**

| Column | Type | Purpose |
|--------|------|---------|
| `question_count` | INTEGER | Number of questions in paper |
| `total_marks` | INTEGER | Sum of all question marks |
| `grade` | VARCHAR(50) | Target grade level |
| `subject` | VARCHAR(100) | Subject category |

**Code tries to INSERT these** → Database must have columns!

---

## 🚀 **Quick Summary:**

**Problem**: Database missing columns that code tries to save  
**Solution**: Run 4 ALTER TABLE statements  
**Time**: 30 seconds  
**Result**: Question papers save successfully! ✅

---

## 💡 **Complete SQL (All-in-One):**

I've updated the file: **`ADD-QUESTION-COUNT-COLUMN.sql`**

It now includes:
- ✅ Add `question_count` column
- ✅ Add `total_marks` column  
- ✅ Add `grade` column
- ✅ Add `subject` column
- ✅ Verification queries

---

**Run the SQL now, then refresh and test!** 🚀

The question paper should save successfully after this! 🎉
