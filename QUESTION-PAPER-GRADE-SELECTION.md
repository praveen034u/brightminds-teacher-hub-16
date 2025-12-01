# Question Paper Grade Selection Feature

## Overview
Added grade/class selection functionality to question paper creation and editing, ensuring every question paper is associated with a specific grade level (1-12).

## Changes Made

### 1. QuestionPaperBuilder Component (`src/components/QuestionPaperBuilder.tsx`)

#### State Management
**Added Grade State:**
```tsx
const [paperGrade, setPaperGrade] = useState(
  existingPaper?.grade || ''
);
```

**Location:** After `paperDescription` state, line ~101

**Purpose:**
- Stores selected grade value
- Initializes from `existingPaper.grade` in edit mode
- Empty string for new papers

---

#### UI - Grade Selection Dropdown

**Added Grade Select Component:**
```tsx
<div>
  <Label htmlFor="paperGrade">Grade / Class *</Label>
  <Select value={paperGrade} onValueChange={(value) => setPaperGrade(value)}>
    <SelectTrigger id="paperGrade">
      <SelectValue placeholder="Select grade level" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="1">Grade 1</SelectItem>
      <SelectItem value="2">Grade 2</SelectItem>
      <SelectItem value="3">Grade 3</SelectItem>
      <SelectItem value="4">Grade 4</SelectItem>
      <SelectItem value="5">Grade 5</SelectItem>
      <SelectItem value="6">Grade 6</SelectItem>
      <SelectItem value="7">Grade 7</SelectItem>
      <SelectItem value="8">Grade 8</SelectItem>
      <SelectItem value="9">Grade 9</SelectItem>
      <SelectItem value="10">Grade 10</SelectItem>
      <SelectItem value="11">Grade 11</SelectItem>
      <SelectItem value="12">Grade 12</SelectItem>
    </SelectContent>
  </Select>
</div>
```

**Location:** After description field, line ~909

**Features:**
- ✅ Required field marked with asterisk (*)
- ✅ Grades 1-12 available
- ✅ Clear placeholder text
- ✅ Accessible with proper label association

**Visual Position:**
```
┌─────────────────────────────────────┐
│ Question Paper Title *              │
│ [Input field]                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Instructions / Description          │
│ [Input field]                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Grade / Class *                     │
│ [Dropdown: Select grade level]     │
└─────────────────────────────────────┘

┌──────────────┬─────────────────────┐
│ Question Type│ Complexity         │
│ [Dropdown]   │ [Dropdown]         │
└──────────────┴─────────────────────┘
```

---

#### Save Logic

**Added Grade Validation:**
```tsx
if (!paperGrade) {
  toast.error('Please select a grade level');
  return;
}
```

**Location:** In `handleSaveQuestionPaper`, after title validation, line ~677

**Validation Order:**
1. Title required
2. **Grade required** ← NEW
3. At least one question required

---

**Included Grade in Database Save:**
```tsx
const paperData = {
  teacher_id: teacherId,
  title: paperTitle,
  description: paperDescription,
  grade: paperGrade,  // ← NEW FIELD
  questions: questions,
  question_count: questions.length,
  total_marks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
  updated_at: new Date().toISOString()
};
```

**Location:** In `handleSaveQuestionPaper`, line ~688

**Database Column:** `question_papers.grade` (VARCHAR(50))

---

### 2. QuestionPapersPage Component (`src/pages/QuestionPapersPage.tsx`)

#### Card Display - Grade Badge

**Added Grade Badge to Stats Section:**
```tsx
{paper.grade && (
  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50/50 rounded-full border border-green-100/50">
    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
    <span className="text-xs font-medium text-green-600">
      Grade {paper.grade}
    </span>
  </div>
)}
```

**Location:** Card header badges section, line ~410

**Visual Design:**
- 🟢 Green color scheme (differentiates from blue/purple stats)
- 📍 First badge position (most prominent)
- 🎨 Matches existing badge style (rounded pill, subtle background)
- 🔵 Dot indicator for consistency

**Badge Order:**
```
┌────────────────────────────────────────┐
│  📄 Document Icon                      │
│  [Grade 8] [5 Questions] [50 Marks]   │
│  ↑ NEW     ↑ Existing    ↑ Existing   │
└────────────────────────────────────────┘
```

---

#### Preview Dialog - Grade Display

**Added Grade to Statistics Grid:**
```tsx
<div className="grid grid-cols-3 gap-2">
  {selectedPaper.grade && (
    <div className="text-center p-2 bg-green-100 rounded">
      <div className="text-lg font-bold text-green-800">
        {selectedPaper.grade}
      </div>
      <div className="text-xs text-green-700">Grade</div>
    </div>
  )}
  <div className="text-center p-2 bg-blue-100 rounded">
    {/* Questions stat */}
  </div>
  <div className="text-center p-2 bg-purple-100 rounded">
    {/* Marks stat */}
  </div>
</div>
```

**Location:** Preview dialog statistics, line ~525

**Changed Grid:** `grid-cols-2` → `grid-cols-3`

**Visual Layout:**
```
┌──────────────────────────────────────┐
│ Statistics                           │
├───────┬──────────┬──────────────────┤
│ Grade │ Questions│ Total Marks      │
│  [8]  │   [5]    │    [50]         │
│ 🟢    │  🔵     │    🟣           │
└───────┴──────────┴──────────────────┘
```

---

## User Experience Flow

### Creating New Question Paper

1. **Click "Create Question Paper" button**
   - Opens modal dialog
   - QuestionPaperBuilder component loads

2. **Fill Required Fields** (in order):
   ```
   ✓ Question Paper Title
   ✓ Instructions (optional)
   ✓ Grade / Class ← NEW REQUIRED FIELD
   ✓ Add questions
   ```

3. **Select Grade:**
   - Click dropdown
   - Choose from Grade 1-12
   - Required before saving

4. **Validation on Save:**
   - Missing title → Error: "Please enter a title"
   - Missing grade → Error: "Please select a grade level" ← NEW
   - No questions → Error: "Please add at least one question"

5. **Success:**
   - Paper saved with grade
   - Grade badge visible on card
   - Grade filters paper in list

---

### Editing Existing Question Paper

1. **Click Edit button** on paper card
   - Opens modal with QuestionPaperBuilder
   - Grade dropdown pre-filled with existing value

2. **Modify Grade:**
   - Can change grade level
   - Still required (can't be removed)

3. **Save Changes:**
   - Grade updated in database
   - Badge updates on card
   - Filter behavior updates

---

## Visual Design Specifications

### Grade Badge on Card
```css
/* Styling */
background: bg-green-50/50
border: border-green-100/50
rounded-full
padding: px-3 py-1.5

/* Text */
color: text-green-600
font: font-medium
size: text-xs

/* Indicator Dot */
color: bg-green-500
size: w-1.5 h-1.5
shape: rounded-full
```

### Grade in Preview Dialog
```css
/* Container */
background: bg-green-100
padding: p-2
rounded
text-align: center

/* Number */
color: text-green-800
font: font-bold
size: text-lg

/* Label */
color: text-green-700
size: text-xs
```

---

## Color Coding System

| Element | Color | Purpose |
|---------|-------|---------|
| Grade | 🟢 Green | New identifier, stands out |
| Questions | 🔵 Blue | Question count metric |
| Marks | 🟣 Purple | Scoring metric |

**Rationale:**
- Green = Grade (alphabetically first, visually first)
- Blue = Questions (primary metric)
- Purple = Marks (secondary metric)

---

## Database Schema

**Table:** `question_papers`

**Grade Column:**
```sql
ALTER TABLE question_papers 
ADD COLUMN IF NOT EXISTS grade VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_question_papers_grade 
  ON question_papers(grade);
```

**Data Type:** VARCHAR(50)
- Stores: "1", "2", ..., "12"
- Allows future expansion (e.g., "Pre-K", "Grade 12 Advanced")

**Index:** Optimizes grade-based filtering

---

## Filtering Integration

### Grade Filter Context
The grade field integrates with existing `GradeFilterContext`:

```tsx
// In QuestionPapersPage.tsx
const filteredQuestionPapers = useMemo(() => {
  if (selectedGrades.length === 0) {
    return questionPapers;
  }
  return questionPapers.filter((paper) => 
    selectedGrades.includes(paper.grade)
  );
}, [questionPapers, selectedGrades]);
```

**User Flow:**
1. Teacher selects "Grade 8" in filter dropdown
2. Only question papers with `grade: "8"` display
3. Stats update to show filtered count
4. Badge shows which grade each paper belongs to

---

## Validation Rules

### Frontend Validation
```tsx
// Required field validation
if (!paperGrade) {
  toast.error('Please select a grade level');
  return;
}
```

**Triggers:**
- On save button click
- Before database operation
- Shows user-friendly error message

### Backend Validation
Database column allows NULL, but frontend enforces:
- ✅ Always require grade selection
- ✅ Validate before INSERT/UPDATE
- ✅ No empty string allowed

---

## Error Handling

### Missing Grade on Create
```
❌ User clicks Save without selecting grade
📱 Toast notification: "Please select a grade level"
🔄 Form remains open
✏️ Grade dropdown highlighted (via label *)
```

### Missing Grade on Edit
```
⚠️ Existing paper without grade (legacy data)
📥 Dropdown shows placeholder: "Select grade level"
🔴 Save blocked until grade selected
✅ One-time migration fixes legacy data
```

### Invalid Grade Value
```
🛡️ Dropdown restricts to 1-12 only
🚫 Cannot enter custom value
✅ No validation needed for invalid grades
```

---

## Accessibility

### Keyboard Navigation
```
Tab Order:
1. Title field
2. Description field
3. Grade dropdown ← NEW
4. Question type dropdown
5. Complexity dropdown
6. Tab content
```

### Screen Reader Support
```html
<Label htmlFor="paperGrade">Grade / Class *</Label>
<Select id="paperGrade" ...>
```

**Announcements:**
- "Grade / Class, required, dropdown"
- "Selected: Grade 8"
- Error: "Please select a grade level"

### Focus Management
- Dropdown opens with Enter/Space
- Arrow keys navigate options
- Enter selects option
- Escape closes dropdown

---

## Testing Checklist

### Create New Paper
- [ ] Grade dropdown displays 1-12 options
- [ ] Placeholder text: "Select grade level"
- [ ] Required asterisk (*) visible
- [ ] Cannot save without selecting grade
- [ ] Error message shows when grade missing
- [ ] Selected grade saves to database
- [ ] Grade badge appears on card

### Edit Existing Paper
- [ ] Dropdown pre-filled with paper's grade
- [ ] Can change grade value
- [ ] Cannot remove grade (still required)
- [ ] Updated grade saves to database
- [ ] Badge updates on card

### Display & Filtering
- [ ] Grade badge shows on all cards with grade
- [ ] Badge shows "Grade X" format
- [ ] Green color differentiates from other badges
- [ ] Grade appears first in badge row
- [ ] Preview dialog shows grade in stats
- [ ] Grade filter includes/excludes papers correctly
- [ ] Papers without grade show in "All" view

### Edge Cases
- [ ] Legacy papers without grade (should allow setting)
- [ ] Long grade values (e.g., "12") fit in badge
- [ ] Multiple papers with same grade
- [ ] Switching grades during edit
- [ ] Cancel edit preserves original grade

---

## Migration Considerations

### Existing Data
```sql
-- Check papers without grade
SELECT COUNT(*) FROM question_papers WHERE grade IS NULL;

-- Backfill strategy (manual)
UPDATE question_papers 
SET grade = 'UNKNOWN' 
WHERE grade IS NULL;
```

### Handling Legacy Papers
**Option 1: Soft Requirement**
- Allow viewing/editing without grade
- Prompt to add grade on next edit

**Option 2: Hard Requirement** (Current Implementation)
- Force grade selection on edit
- One-time update for all legacy papers

---

## Future Enhancements

### Potential Improvements

1. **Grade Ranges**
   ```tsx
   <SelectItem value="9-12">Grades 9-12</SelectItem>
   <SelectItem value="any">Any Grade</SelectItem>
   ```

2. **Grade-Specific Templates**
   ```tsx
   // Auto-suggest complexity based on grade
   if (grade <= 5) complexity = 'easy'
   if (grade >= 9) complexity = 'hard'
   ```

3. **Bulk Grade Assignment**
   ```tsx
   // Select multiple papers → Set grade for all
   ```

4. **Grade-Based Sorting**
   ```tsx
   // Sort papers by grade: 1, 2, 3...
   sortedPapers.sort((a, b) => 
     parseInt(a.grade) - parseInt(b.grade)
   )
   ```

5. **Grade Badges in Multiple Places**
   - Student assignment view
   - Print layout header
   - Export filename: "Math_Grade8_2024.pdf"

---

## Benefits

### For Teachers
✅ **Better Organization**
- Quickly identify grade level
- Filter papers by grade
- Group papers for specific classes

✅ **Reusability**
- Find papers for specific grade
- Adapt papers to different grades
- Track grade-appropriate difficulty

✅ **Clarity**
- No confusion about target audience
- Consistent naming convention
- Easy identification in lists

### For System
✅ **Data Quality**
- Structured grade information
- Enables grade-based analytics
- Supports reporting by grade

✅ **Filtering**
- Fast grade-based queries (indexed)
- Consistent filter behavior
- Accurate stats display

---

## Technical Notes

### State Management
```tsx
// Grade state is independent
const [paperGrade, setPaperGrade] = useState(
  existingPaper?.grade || ''
);

// Not tied to AI generation grade
// llmGrade is separate for AI context
```

### Database Operations
```tsx
// CREATE
const { data, error } = await supabase
  .from('question_papers')
  .insert([{ 
    ...paperData, 
    grade: paperGrade 
  }]);

// UPDATE  
const { data, error } = await supabase
  .from('question_papers')
  .update({ 
    ...paperData, 
    grade: paperGrade 
  })
  .eq('id', existingPaper.id);
```

### Props Flow
```
QuestionPapersPage
  ↓ existingPaper.grade
QuestionPaperBuilder
  ↓ paperGrade state
Select component
  ↓ onValueChange
setPaperGrade
  ↓ handleSaveQuestionPaper
paperData.grade
  ↓ supabase.insert/update
Database
```

---

## Summary

### What Changed
1. ✅ Added grade selection dropdown to question paper form
2. ✅ Made grade a required field with validation
3. ✅ Included grade in save/update operations
4. ✅ Display grade badge on paper cards (green)
5. ✅ Show grade in preview dialog statistics
6. ✅ Integrated with existing grade filter system

### What Stayed the Same
- ✅ All existing functionality preserved
- ✅ Question creation methods unchanged
- ✅ Paper display and actions work as before
- ✅ Edit mode loads existing data correctly

### Impact
- **Files Modified:** 2
  - `src/components/QuestionPaperBuilder.tsx`
  - `src/pages/QuestionPapersPage.tsx`
- **Lines Changed:** ~50
- **New Dependencies:** None
- **Breaking Changes:** None (backward compatible)

---

## Conclusion

The grade selection feature is now fully integrated into the question paper system. Teachers can:
- ✅ Select grade when creating papers
- ✅ Modify grade when editing papers
- ✅ See grade badges on all paper cards
- ✅ Filter papers by grade using existing filter
- ✅ View grade in preview/details

The implementation follows the existing design patterns, maintains consistency with the codebase, and provides a clear, intuitive user experience.
