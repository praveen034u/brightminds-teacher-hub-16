# Admin Portal Database Setup - Updated for Existing Schema

## Overview
The Admin Portal has been updated to work with your existing database schema using the **`teachers`** table instead of creating a new `profiles` table.

## What Changed

### 1. Database Script (ADMIN-PORTAL-SETUP.sql)
Updated to work with existing `teachers` table:
- ✅ Adds `role` column to `teachers` table (admin/teacher)
- ✅ Adds `is_active` column for account management
- ✅ Adds `school_id` UUID column (complements existing `school_name`)
- ✅ Creates `announcements` table for newsletters
- ✅ Sets up Row Level Security (RLS) policies
- ✅ Creates indexes for performance

### 2. Frontend Code Updates
All components updated to use `teachers` table:

**AdminTeachers.tsx**
```typescript
// Before: .from('profiles')
// After:  .from('teachers')
```

**Edge Function (admin-teachers/index.ts)**
```typescript
// All queries updated from 'profiles' to 'teachers'
// ✅ Admin verification
// ✅ List teachers
// ✅ Activate/deactivate
```

### 3. New Migration File
Created: `migrations/001-add-role-to-teachers.sql`
- Standalone migration script for adding admin columns to teachers table
- Can be run independently or use ADMIN-PORTAL-SETUP.sql

## Running the Setup

### Option 1: All-in-One Script (Recommended)
Run the complete setup script in Supabase SQL Editor:

```sql
-- File: ADMIN-PORTAL-SETUP.sql
-- This includes everything: teachers table updates + announcements table
```

### Option 2: Step-by-Step Migration
Run migrations individually:

```bash
# 1. Add role columns to teachers table
migrations/001-add-role-to-teachers.sql

# 2. The announcements table is in ADMIN-PORTAL-SETUP.sql (Part 2)
```

## Database Schema Changes

### Teachers Table - New Columns
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `role` | text | 'teacher' | User role: 'admin' or 'teacher' |
| `is_active` | boolean | true | Account active status |
| `school_id` | uuid | NULL | School UUID for multi-school support |

### Announcements Table - New Table
```sql
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text DEFAULT 'banner',
  audience text DEFAULT 'all',
  start_at timestamptz DEFAULT now(),
  end_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Key Points

### Existing Data Preserved
- ✅ All existing teachers remain unchanged
- ✅ `school_name` text field is kept (backward compatible)
- ✅ New `school_id` UUID field added alongside
- ✅ All existing foreign keys remain intact

### Table Relationships
Your existing schema has these foreign keys to `teachers` table:
- `assignments.teacher_id` → `teachers.id`
- `rooms.teacher_id` → `teachers.id`
- `students.teacher_id` → `teachers.id`
- `question_bank.teacher_id` → `teachers.id`

All relationships remain unchanged. The new columns (`role`, `is_active`, `school_id`) are additional fields.

## Row Level Security (RLS)

### Announcements Table Policies

**Admin Full Access**
```sql
-- Admins can create, read, update, delete announcements for their school
CREATE POLICY announcements_admin_all 
ON public.announcements
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.auth0_user_id = auth.uid()
    AND teachers.role = 'admin'
    AND teachers.school_id = announcements.school_id
  )
);
```

**Teachers Read Access**
```sql
-- Teachers can read active announcements for their school
CREATE POLICY announcements_read_active 
ON public.announcements
FOR SELECT TO authenticated
USING (
  is_active = true
  AND audience IN ('all', 'teachers')
  AND school_id = (SELECT school_id FROM teachers WHERE auth0_user_id = auth.uid())
);
```

## Setting Your First Admin

After running the SQL script, promote a teacher to admin:

```sql
-- Replace 'auth0|1234567890' with actual Auth0 user ID
UPDATE public.teachers
SET 
  role = 'admin',
  school_id = gen_random_uuid()  -- Create a school ID
WHERE auth0_user_id = 'auth0|1234567890';
```

To set multiple users in same school:
```sql
-- First user - create school
UPDATE public.teachers
SET 
  role = 'admin',
  school_id = gen_random_uuid()
WHERE auth0_user_id = 'auth0|admin-user-id'
RETURNING school_id;

-- Copy the returned school_id and use it for other users
UPDATE public.teachers
SET school_id = '<paste-school-id-here>'
WHERE auth0_user_id IN ('auth0|teacher1', 'auth0|teacher2');
```

## Verification Queries

Run these to verify setup:

```sql
-- 1. Check new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'teachers'
AND column_name IN ('role', 'is_active', 'school_id');

-- 2. Check announcements table
SELECT table_name FROM information_schema.tables
WHERE table_name = 'announcements';

-- 3. List all admins
SELECT id, full_name, email, role, school_id, is_active
FROM public.teachers
WHERE role = 'admin';

-- 4. Check RLS policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'announcements';
```

## Next Steps

1. ✅ Run `ADMIN-PORTAL-SETUP.sql` in Supabase SQL Editor
2. ✅ Promote at least one teacher to admin role
3. ✅ Configure Auth0 Action (see `ADMIN-PORTAL-AUTH0-ACTION.md`)
4. ✅ Deploy edge functions (if using API endpoints)
5. ✅ Test admin portal at `/admin` route

## Important Notes

### Auth0 Configuration Required
The admin portal relies on Auth0 to inject the role claim. See `ADMIN-PORTAL-AUTH0-ACTION.md` for setup.

### School ID Management
- The new `school_id` UUID field is for multi-school support
- Existing `school_name` text field remains for backward compatibility
- You can use both or migrate from `school_name` to `school_id` over time

### Migration Safety
- All `ALTER TABLE` statements use `IF NOT EXISTS` to prevent errors
- Constraint creation wrapped in `DO $$ BEGIN ... EXCEPTION` blocks
- Safe to re-run the script multiple times

## Troubleshooting

### Issue: "Column already exists"
**Solution:** The script uses `IF NOT EXISTS` - this is normal and safe.

### Issue: RLS prevents access
**Solution:** Verify user has correct `role` and `school_id`:
```sql
SELECT * FROM teachers WHERE auth0_user_id = '<your-auth0-id>';
```

### Issue: Announcements not showing
**Solution:** Check `is_active`, `start_at`, `end_at` dates:
```sql
SELECT * FROM announcements 
WHERE is_active = true 
AND start_at <= now() 
AND (end_at IS NULL OR end_at >= now());
```

## Files Updated

### Database Scripts
- ✅ `ADMIN-PORTAL-SETUP.sql` - Main setup script (teachers table)
- ✅ `migrations/001-add-role-to-teachers.sql` - Standalone migration

### Frontend Code
- ✅ `src/pages/admin/AdminTeachers.tsx` - Uses `teachers` table
- ✅ `src/pages/admin/AdminNewsletters.tsx` - No changes needed
- ✅ `src/components/AnnouncementBanner.tsx` - No changes needed

### Backend Code
- ✅ `supabase/functions/admin-teachers/index.ts` - Uses `teachers` table
- ✅ `src/context/AuthContext.tsx` - Uses backend API (no direct queries)

## Summary

The admin portal is now fully compatible with your existing database schema. All references to a `profiles` table have been replaced with `teachers` table, while preserving all existing data and relationships.

**Key Benefits:**
- ✅ No data migration required
- ✅ Backward compatible with existing code
- ✅ Minimal changes to database structure
- ✅ All foreign keys remain intact
- ✅ Ready to use immediately after running SQL script
