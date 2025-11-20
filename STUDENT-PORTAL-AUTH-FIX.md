# Student Portal Authentication Fix

## Problem
The student portal was getting 401 authentication errors when trying to:
- Start assignments
- Complete assignments  
- Sync progress with the teacher dashboard

Error messages included:
- "❌ Direct Supabase insert failed: Object"
- "❌ Both backend and direct Supabase failed: Object"  
- "⚠️ Assignment completion may not be synced to teacher dashboard"

## Root Cause
The student portal code was using **hardcoded Supabase API keys** from a different project:

**Hardcoded (wrong) project reference:**
```
qwqaezhrufdrewpbakxz
```

**Current project ID:**
```
lfsmtsnakdaukxgrqynk
```

This mismatch caused all direct Supabase operations in the student portal to fail with 401 errors because they were trying to authenticate against the wrong Supabase project.

## Files Fixed

### 1. StudentPortalPage.tsx
**Issue:** Three instances of hardcoded Supabase keys in different functions:

1. **Start Assignment Function (Line ~1151)**
2. **Complete Assignment Function (Line ~1291)**  
3. **Real-time Broadcast Function (Line ~1367)**

**Before:**
```typescript
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWFlemhydWZkcmV3cGJha3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NTEzNzksImV4cCI6MjA0ODEyNzM3OX0.ftDq9dQLhRLlsXZ_ckUQxm2b0RZm8BQr1AAUHwhPXJc';
```

**After:**
```typescript
const supabaseKey = getSupabasePublishableKey();
```

### 2. Supabase Configuration (Already Fixed)
The `supabase/config.toml` already includes:
```toml
[functions.assignment-attempts]
verify_jwt = false
```

## Functions Affected

### Start Assignment Flow:
1. Try backend API call via `assignment-attempts` function
2. **Fallback:** Direct Supabase insert (was failing due to wrong key)
3. **Final fallback:** Local state only

### Complete Assignment Flow:  
1. Try backend API call via `assignment-attempts` function
2. **Fallback:** Direct Supabase insert (was failing due to wrong key)
3. **Final fallback:** Local state only
4. **Verification:** Real-time broadcast to teachers (was failing due to wrong key)

## Expected Results After Fix

### ✅ Working Flows:
- **Assignment Start:** Should save to database properly, no more "Local tracking" fallbacks
- **Assignment Completion:** Should save completion and sync with teacher dashboard
- **Real-time Updates:** Teachers should see student progress updates immediately
- **Progress Tracking:** Assignment attempts should be properly recorded in database

### ✅ No More Error Messages:
- ❌ "Direct Supabase insert failed"  
- ❌ "Both backend and direct Supabase failed"
- ❌ "Assignment completion may not be synced to teacher dashboard"

### ✅ Better User Experience:
- Students get immediate confirmation when starting/completing assignments
- Teachers see real-time progress updates
- No more "please check with teacher" warning messages
- Reliable data persistence instead of local-only tracking

## Testing Checklist

1. **Student Portal Access:** Navigate to student portal with valid token
2. **Start Assignment:** Click "Start Assignment" - should save to DB without errors
3. **Complete Assignment:** Complete a game/assignment - should sync to teacher dashboard
4. **Teacher View:** Check teacher assignments page - should show updated progress
5. **Real-time Updates:** Changes should appear immediately on teacher dashboard

The fix ensures all student operations use the correct project credentials and properly authenticate with the current Supabase instance.