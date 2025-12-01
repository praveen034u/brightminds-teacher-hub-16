# Assignment Update Fix - Database Column Mismatch

## Problem
When trying to update an assignment, the operation was failing with a **500 Internal Server Error**:
```
PUT .../assignments?auth0_user_id=...&id=... 500 (Internal Server Error)
{"error":"Unknown error"}
```

## Root Cause
The `PUT` endpoint in the edge function was attempting to update the assignment with **all fields from the request body**:

```typescript
// Backend: supabase/functions/assignments/index.ts (line 256)
const { data: assignment, error } = await supabase
  .from('assignments')
  .update(body)  // ❌ Updates with ALL fields from body
  .eq('id', assignmentId)
  .eq('teacher_id', teacherId)
  .select()
  .single();
```

The frontend was sending `assignmentData` which contained **frontend-specific fields** that don't exist in the database:
- `roomType` (frontend state, not a DB column)
- `roomValue` (frontend state, not a DB column)
- `gameConfig` (at top level, but should be `game_config`)

These invalid column names caused the database update to fail.

## Database Schema (assignments table)
Valid columns:
- `id`
- `teacher_id`
- `title`
- `description`
- `grade`
- `due_date`
- `status`
- `room_id`
- `assignment_type`
- `game_type`
- `game_id`
- `game_config` (JSONB)
- `question_paper_id`
- `created_at`
- `updated_at`

## Solution
Created a separate `updateData` object for edit mode that only contains **valid database columns**:

### Before (AssignmentsPage.tsx - Line 630)
```typescript
const result = isEditMode 
  ? await assignmentsAPI.update(auth0UserId, editingAssignmentId!, assignmentData)
  : await assignmentsAPI.create(auth0UserId, assignmentData);
```

### After (AssignmentsPage.tsx - Lines 628-643)
```typescript
// For update, only send database-valid fields (no roomType, roomValue, gameConfig at top level)
const updateData = isEditMode ? {
  title,
  description,
  grade,
  due_date: dueDate,
  status: 'active',
  room_id: finalRoomId,
  assignment_type: roomType === 'prebuilt' ? 'game' : 'custom',
  ...(roomType === 'prebuilt' && forcedGameType ? { game_type: forcedGameType } : {}),
  ...(roomType === 'prebuilt' && selectedPrebuiltRoom ? { game_id: selectedPrebuiltRoom } : {}),
  ...(roomType === 'prebuilt' ? { game_config: injectedGameConfig } : {}),
  question_paper_id: roomType === 'custom' && selectedQuestionPaper && !selectedQuestionPaper.startsWith('local_') 
    ? selectedQuestionPaper 
    : null,
} : assignmentData;

console.log(isEditMode ? '🔄 Updating assignment with data:' : '📤 Creating assignment with data:', JSON.stringify(updateData, null, 2));

if (isEditMode) {
  console.log('📋 Update payload fields:', Object.keys(updateData));
  console.log('🔑 Assignment ID to update:', editingAssignmentId);
}

const result = isEditMode 
  ? await assignmentsAPI.update(auth0UserId, editingAssignmentId!, updateData)
  : await assignmentsAPI.create(auth0UserId, assignmentData);
```

## Key Changes

### 1. Separate Update Data Object
- Created `updateData` for edit mode that maps frontend state to valid DB columns
- Uses `assignmentData` for create mode (unchanged)

### 2. Valid Column Mapping
**Frontend State → Database Column:**
- `title` → `title` ✅
- `description` → `description` ✅
- `grade` → `grade` ✅
- `dueDate` → `due_date` ✅
- `finalRoomId` → `room_id` ✅
- `roomType === 'prebuilt' ? 'game' : 'custom'` → `assignment_type` ✅
- `forcedGameType` → `game_type` ✅ (conditional)
- `selectedPrebuiltRoom` → `game_id` ✅ (conditional for prebuilt)
- `injectedGameConfig` → `game_config` ✅ (conditional for prebuilt)
- `selectedQuestionPaper` → `question_paper_id` ✅ (conditional for custom)

### 3. Removed Invalid Fields
- ❌ `roomType` (frontend-only)
- ❌ `roomValue` (frontend-only)
- ❌ `gameConfig` at top level (should be `game_config`)

### 4. Enhanced Logging
Added debug logs to verify payload:
```typescript
console.log('📋 Update payload fields:', Object.keys(updateData));
console.log('🔑 Assignment ID to update:', editingAssignmentId);
```

## Testing Checklist

### Test Scenarios:
1. ✅ **Update Custom Assignment**
   - Change title, description, grade
   - Change question paper
   - Change room assignment

2. ✅ **Update Prebuilt Game Assignment**
   - Change title, description, grade
   - Change game type
   - Change game difficulty/category
   - Change room assignment

3. ✅ **Update Assignment Room**
   - Change from "No Room" to specific room
   - Change from specific room to another room
   - Change from specific room to "No Room"

4. ✅ **Update Due Date**
   - Change due date
   - Remove due date

## Files Modified
- `src/pages/AssignmentsPage.tsx` (Lines 628-650)

## Related Issues
- Assignment edit functionality was added but update was failing
- Backend edge function expects only valid database columns
- Frontend was sending UI state variables mixed with database fields

## Prevention
**Backend Improvement Suggestion:**
Instead of directly using `update(body)`, the backend should explicitly whitelist allowed update fields:

```typescript
// Recommended backend approach
const allowedFields = {
  title: body.title,
  description: body.description,
  grade: body.grade,
  due_date: body.due_date,
  status: body.status,
  room_id: body.room_id,
  assignment_type: body.assignment_type,
  game_type: body.game_type,
  game_id: body.game_id,
  game_config: body.game_config,
  question_paper_id: body.question_paper_id,
};

// Remove undefined values
Object.keys(allowedFields).forEach(key => 
  allowedFields[key] === undefined && delete allowedFields[key]
);

const { data: assignment, error } = await supabase
  .from('assignments')
  .update(allowedFields)  // ✅ Only valid fields
  .eq('id', assignmentId)
  .eq('teacher_id', teacherId)
  .select()
  .single();
```

This would provide better error messages and prevent similar issues in the future.
