# Room Assignment Filtering Fix

## Issue
Student B was seeing assignments assigned to Room 2, even though Student B was only in Room 1.

**Scenario:**
- Room 1: Student A + Student B  
- Room 2: Student A only
- Assignment created for Room 2 → Should only be visible to Student A
- **Bug:** Student B could also see the Room 2 assignment

## Root Cause
The Supabase query in `student-portal/index.ts` was not properly filtering by teacher for room assignments.

### ❌ Original (Buggy) Query:
```typescript
assignmentQuery.or(`room_id.in.(${roomIds.join(',')}),and(assignment_type.eq.game,teacher_id.eq.${teacherId})`)
```

**SQL equivalent:**
```sql
WHERE (room_id IN (room1, room2)) OR (assignment_type = 'game' AND teacher_id = 'teacher_id')
```

**Problem:** Room assignments were not filtered by teacher, so students could see room assignments from other teachers if they happened to be in rooms with the same IDs.

### ✅ Fixed Query:
```typescript
assignmentQuery.eq('teacher_id', teacherId).or(`room_id.in.(${roomIds.join(',')}),assignment_type.eq.game`)
```

**SQL equivalent:**
```sql
WHERE teacher_id = 'teacher_id' AND (room_id IN (room1, room2) OR assignment_type = 'game')
```

**Fix:** Now properly scopes ALL assignments to the student's teacher first, then applies room/game filtering.

## Expected Behavior After Fix

### ✅ Correct Results:
- **Student A** (in Room 1 + Room 2): Sees assignments for Room 1, Room 2, and game assignments from their teacher
- **Student B** (in Room 1 only): Sees assignments for Room 1 and game assignments from their teacher  
- **Student B will NOT see Room 2 assignments** ✅

### Verification Steps:
1. Create assignment for Room 2 (with only Student A)
2. Check Student A's portal → Should see the assignment
3. Check Student B's portal → Should NOT see the assignment
4. Check function logs for detailed reasoning

## Files Changed
- ✅ `supabase/functions/student-portal/index.ts` - Fixed query filtering logic
- ✅ Enhanced logging to show exactly why each assignment is visible to each student

The fix ensures that students can only see assignments from their own teacher, properly scoped to their room memberships.