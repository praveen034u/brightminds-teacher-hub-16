# EMERGENCY DEBUG GUIDE - Question Paper Not Opening

## 🚨 CRITICAL DEBUGGING STEPS - DO THIS NOW

### Step 1: Open Browser Console (F12)

### Step 2: Run This Code in Console
Paste this EXACTLY in your browser console:

```javascript
// Check if assignment has question_paper_id
console.log('=== DEBUGGING ASSIGNMENT DATA ===');

// Find the Start Assignment button
const buttons = document.querySelectorAll('button');
buttons.forEach((btn, idx) => {
  if (btn.textContent.includes('Start Assignment')) {
    console.log(`Button ${idx}:`, btn.textContent);
  }
});

// Check localStorage for student data
const studentDataStr = localStorage.getItem('student_data');
if (studentDataStr) {
  const studentData = JSON.parse(studentDataStr);
  console.log('Student Data:', studentData);
  console.log('Assignments:', studentData.assignments);
  
  // Check each assignment
  studentData.assignments?.forEach((assignment, idx) => {
    console.log(`\nAssignment ${idx + 1}:`, {
      id: assignment.id,
      title: assignment.title,
      assignment_type: assignment.assignment_type,
      question_paper_id: assignment.question_paper_id,
      hasQuestionPaper: !!assignment.question_paper_id,
      willOpenModal: !!assignment.question_paper_id ? 'YES ✅' : 'NO ❌'
    });
  });
} else {
  console.log('❌ No student data in localStorage');
}
```

### Step 3: Share the Output

Copy EVERYTHING that appears in the console and send it to me.

---

## 🔍 What I'm Checking

1. **Does the assignment have `question_paper_id`?**
   - If NO → That's the problem! Need to update database
   - If YES → Something else is wrong

2. **Is the button calling the right function?**
   - Should call `startAssignmentWithQuestionPaper()`
   - NOT `startAssignment()`

3. **Is localStorage data correct?**
   - Student data should have assignments array
   - Each assignment should have question_paper_id field

---

## 🎯 Quick Database Check

Run this in Supabase SQL Editor:

```sql
-- CRITICAL: Check your actual assignment data
SELECT 
  a.id,
  a.title,
  a.assignment_type,
  a.question_paper_id,
  a.room_id,
  r.name as room_name,
  CASE 
    WHEN a.question_paper_id IS NOT NULL THEN '✅ HAS QUESTION PAPER'
    ELSE '❌ MISSING QUESTION PAPER ID'
  END as status
FROM assignments a
LEFT JOIN rooms r ON r.id = a.room_id
WHERE a.status = 'active'
ORDER BY a.created_at DESC
LIMIT 10;
```

### If question_paper_id is NULL:

```sql
-- Find a question paper
SELECT id, title, jsonb_array_length(questions) as q_count 
FROM question_papers 
LIMIT 5;

-- Update your assignment (REPLACE THE IDs)
UPDATE assignments
SET question_paper_id = 'PASTE-QUESTION-PAPER-ID-HERE'
WHERE id = 'PASTE-ASSIGNMENT-ID-HERE';

-- Verify it worked
SELECT id, title, question_paper_id 
FROM assignments 
WHERE id = 'PASTE-ASSIGNMENT-ID-HERE';
```

---

## 📞 EMERGENCY: If Nothing Works

### Option 1: Force Reload Student Data

In browser console:
```javascript
// Clear cache
localStorage.clear();

// Reload page
location.reload();
```

### Option 2: Check Network Requests

1. Open DevTools → Network tab
2. Click "Start Assignment"
3. Look for requests to:
   - `student-portal` endpoint
   - `question_papers` table query
4. Check if any errors

### Option 3: Direct Test

In browser console, paste this:
```javascript
// Get the student portal page instance
const testAssignment = {
  id: 'test-123',
  title: 'Test Assignment',
  question_paper_id: 'YOUR-ACTUAL-QUESTION-PAPER-ID',
  assignment_type: 'custom'
};

console.log('Testing with:', testAssignment);

// This should trigger the modal
// (Replace with actual question_paper_id from your database)
```

---

## ⚠️ Common Issues

### Issue 1: "Assignment started!" toast but no modal
**Cause:** `question_paper_id` is NULL in database  
**Fix:** Run UPDATE SQL above

### Issue 2: Console shows "No question paper - Starting standard assignment"
**Cause:** Button is not detecting question_paper_id  
**Fix:** Check localStorage data with code above

### Issue 3: Console shows nothing when clicking button
**Cause:** JavaScript error breaking the code  
**Fix:** Look for RED errors in console, share them with me

### Issue 4: "Could not load question paper"
**Cause:** Question paper doesn't exist or has no questions  
**Fix:** Verify question paper exists:
```sql
SELECT * FROM question_papers WHERE id = 'YOUR-ID';
```

---

## 🆘 WHAT TO SEND ME

1. **Console output** from Step 2 above (copy everything)
2. **SQL query results** from database check
3. **Screenshot** of the console when you click "Start Assignment"
4. **Any RED errors** in console
5. **Network tab** - any failed requests

---

## 💡 Last Resort Fix

If NOTHING works, try this nuclear option:

```sql
-- Create a test question paper
INSERT INTO question_papers (id, teacher_id, title, description, questions)
VALUES (
  gen_random_uuid(),
  'YOUR-TEACHER-ID',
  'Test Question Paper',
  'Debug test',
  '[
    {
      "text": "What is 2+2?",
      "type": "multiple-choice",
      "marks": 1,
      "answer": 2,
      "options": ["2", "3", "4", "5"]
    }
  ]'::jsonb
)
RETURNING id;

-- Copy the returned ID, then:
UPDATE assignments
SET question_paper_id = 'PASTE-ID-FROM-ABOVE'
WHERE status = 'active'
LIMIT 1;
```

Then test again!

---

**I NEED THE DEBUG OUTPUT TO HELP YOU PROPERLY!**

Run the JavaScript code in Step 2 and send me the output. That will tell me exactly what's wrong!
