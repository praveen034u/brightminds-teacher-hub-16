# Admin Creation & Setup Guide

## Prerequisites

Before creating admin users, ensure you have:
- ✅ Supabase project set up
- ✅ Database migrations run (`ADMIN-PORTAL-SETUP.sql`)
- ✅ Auth0 configured with custom claims
- ✅ Auth0 Action deployed for role injection

---

## Creating Your First Admin User

### Option 1: Create Admin Directly in Database (Recommended for First Admin)

This is the fastest way to create your very first admin user:

#### Step 1: Create Admin Record

Run this SQL in **Supabase SQL Editor**:

```sql
-- Replace with your actual values
INSERT INTO public.teachers (
  full_name,
  email,
  school_name,
  school_id,
  role,
  is_active,
  grades_taught,
  subjects,
  preferred_language
) VALUES (
  'Admin Full Name',           -- Change this
  'admin@school.com',          -- Change this to admin's email
  'Your School Name',          -- Change this
  gen_random_uuid(),           -- Generates unique school_id
  'admin',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  'English'
);
```

#### Step 2: Admin Signs Up with Auth0

1. Admin visits your app URL
2. Click "Sign Up / Sign In"
3. Choose "Existing Teacher - Sign In"
4. Complete Auth0 signup/login with the email from Step 1
5. Note the `auth0_user_id` (visible in Auth0 Dashboard → Users)

#### Step 3: Link Auth0 Account

Run this SQL to link the Auth0 account:

```sql
-- Get the auth0_user_id from Auth0 Dashboard
UPDATE public.teachers
SET auth0_user_id = 'auth0|110312610799890056297'  -- Replace with actual auth0_user_id
WHERE email = 'admin@school.com';
```

#### Step 4: Set Role in Auth0

1. Go to **Auth0 Dashboard** → **User Management** → **Users**
2. Find and click on the admin user
3. Scroll to **app_metadata** section
4. Click **Edit**
5. Add this JSON:
   ```json
   {
     "role": "admin"
   }
   ```
6. Click **Save**

#### Step 5: Login

1. Logout from the app
2. Login again
3. Should automatically redirect to `/admin`
4. Admin portal should be visible

---

## Creating Additional Admin Users

### Option 2: Promote Existing Teacher to Admin

If the person already has a teacher account:

```sql
-- Find the teacher
SELECT id, full_name, email, role, is_active, school_id 
FROM public.teachers 
WHERE email = 'teacher@school.com';

-- Promote to admin
UPDATE public.teachers
SET 
  role = 'admin',
  is_active = true,
  school_id = COALESCE(school_id, gen_random_uuid())  -- Use existing or create new
WHERE email = 'teacher@school.com';

-- Verify
SELECT id, full_name, email, role, school_id 
FROM public.teachers 
WHERE email = 'teacher@school.com';
```

**Then update Auth0:**
1. Auth0 Dashboard → Users → Find user
2. Edit `app_metadata`
3. Add: `{"role": "admin"}`
4. User must logout and login again

---

### Option 3: Use Admin Onboarding Feature

If you already have an admin and want to create another:

1. Login as existing admin
2. Navigate to `/admin/onboard`
3. Create the new user as a teacher:
   - Fill in their details
   - Provide enrollment code to them
4. New user completes onboarding
5. Promote them to admin:

```sql
UPDATE public.teachers
SET role = 'admin'
WHERE email = 'new-admin@school.com';
```

6. Update their Auth0 `app_metadata` to `{"role": "admin"}`
7. They logout and login again

---

## Quick Setup Script (All-in-One)

Use this script to create multiple admins at once:

```sql
DO $$
DECLARE
  admin_email TEXT := 'admin@school.com';          -- CHANGE THIS
  admin_name TEXT := 'Admin Full Name';            -- CHANGE THIS
  admin_school TEXT := 'Your School Name';         -- CHANGE THIS
  new_school_id UUID;
BEGIN
  -- Generate school_id
  new_school_id := gen_random_uuid();
  
  -- Create or update admin
  INSERT INTO public.teachers (
    full_name, 
    email, 
    school_name, 
    school_id, 
    role, 
    is_active, 
    grades_taught, 
    subjects,
    preferred_language
  ) VALUES (
    admin_name, 
    admin_email, 
    admin_school, 
    new_school_id,
    'admin', 
    true, 
    ARRAY[]::text[], 
    ARRAY[]::text[],
    'English'
  )
  ON CONFLICT (email) 
  DO UPDATE SET 
    role = 'admin',
    is_active = true,
    school_id = COALESCE(teachers.school_id, new_school_id);
  
  RAISE NOTICE 'Admin created/updated: %', admin_email;
  RAISE NOTICE 'School ID: %', new_school_id;
END $$;
```

---

## School Management

### Understanding school_id

- Each admin should have a `school_id` (UUID)
- Teachers in the same school share the same `school_id`
- Admins can only manage teachers in their school

### Create a New School

```sql
-- Create a new school_id
SELECT gen_random_uuid() as new_school_id;

-- Copy the generated UUID and use it for your admin
UPDATE public.teachers
SET school_id = 'paste-uuid-here'
WHERE email = 'admin@school.com';
```

### Assign Teachers to Same School

```sql
-- Get admin's school_id
SELECT school_id FROM public.teachers WHERE email = 'admin@school.com';

-- Assign teachers to the same school
UPDATE public.teachers
SET school_id = 'admin-school-id-here'
WHERE email IN ('teacher1@school.com', 'teacher2@school.com');
```

---

## Verification & Troubleshooting

### Verify Admin Setup

```sql
-- Check admin was created correctly
SELECT 
  id,
  full_name,
  email,
  role,
  is_active,
  school_id,
  auth0_user_id,
  created_at
FROM public.teachers 
WHERE role = 'admin'
ORDER BY created_at DESC;
```

### Check All Admins and Their Schools

```sql
SELECT 
  t.full_name,
  t.email,
  t.role,
  t.school_name,
  t.school_id,
  t.is_active,
  COUNT(teachers_in_school.id) as teacher_count
FROM public.teachers t
LEFT JOIN public.teachers teachers_in_school 
  ON t.school_id = teachers_in_school.school_id 
  AND teachers_in_school.role = 'teacher'
WHERE t.role = 'admin'
GROUP BY t.id, t.full_name, t.email, t.role, t.school_name, t.school_id, t.is_active;
```

---

## Common Issues & Solutions

### Issue 1: Admin Redirected to Teacher Dashboard

**Symptoms:**
- Login successful but see teacher navigation
- Redirected to `/dashboard` instead of `/admin`

**Solutions:**
1. Check database role:
   ```sql
   SELECT role FROM public.teachers WHERE email = 'admin@school.com';
   ```
2. Check Auth0 `app_metadata`:
   - Should have `{"role": "admin"}`
3. Clear browser cache and cookies
4. Logout and login again

### Issue 2: "No Enrollment Found" Error

**Symptoms:**
- Admin tries to login but gets logged out
- Error message about enrollment code

**Solutions:**
1. Ensure teacher record exists BEFORE Auth0 signup:
   ```sql
   SELECT * FROM public.teachers WHERE email = 'admin@school.com';
   ```
2. If missing, create the record first (Option 1)

### Issue 3: Auth0 Role Not Working

**Symptoms:**
- Console shows `role: "teacher"` instead of `"admin"`
- Custom claim missing or incorrect

**Solutions:**
1. Verify Auth0 Action is deployed:
   - Auth0 Dashboard → Actions → Flows → Login
   - Should show "Add BrightMinds Role to Token"
2. Check `app_metadata`:
   ```json
   {
     "role": "admin"
   }
   ```
3. Verify custom claim namespace matches your Auth0 Action:
   - Should be: `https://brightminds.ai4magic.com/role`
4. User MUST logout and login to get new token

### Issue 4: Can't See Admin Navigation

**Symptoms:**
- Logged in but no Teachers/Announcements menu
- Only see teacher features

**Solutions:**
1. Check browser console for role:
   - Should show: `userRole: "admin"`
2. Verify AdminRoute is working:
   - Console should show: `✅ AdminRoute: Access granted`
3. Check database:
   ```sql
   SELECT email, role, is_active FROM public.teachers 
   WHERE email = 'admin@school.com';
   ```

---

## Security Best Practices

### 1. Limit Admin Access
- Only create admin accounts for authorized personnel
- Use unique, strong passwords in Auth0
- Enable MFA in Auth0 for admin accounts

### 2. School Isolation
- Always set `school_id` for admins
- Admins can only see teachers in their school
- Verify school assignments regularly

### 3. Audit Admin Actions
```sql
-- Check who has admin access
SELECT 
  full_name, 
  email, 
  school_name,
  is_active,
  created_at 
FROM public.teachers 
WHERE role = 'admin'
ORDER BY created_at DESC;
```

### 4. Deactivate Old Admins
```sql
-- Deactivate admin (don't delete)
UPDATE public.teachers
SET is_active = false
WHERE email = 'old-admin@school.com';

-- Reactivate if needed
UPDATE public.teachers
SET is_active = true
WHERE email = 'admin@school.com';
```

---

## Testing Admin Access

### Test Checklist

After creating an admin, verify:

- [ ] Admin can login successfully
- [ ] Redirected to `/admin` (not `/dashboard`)
- [ ] Can see admin navigation (Teachers, Onboard Teacher, Announcements)
- [ ] Can access `/admin/teachers` page
- [ ] Teacher list loads correctly
- [ ] Can access `/admin/onboard` page
- [ ] Can create new teacher with enrollment code
- [ ] Can access `/admin/newsletters` page
- [ ] Can create announcements
- [ ] Console shows `role: "admin"`
- [ ] Console shows `✅ AdminRoute: Access granted`

### Test Commands

```sql
-- 1. Verify admin exists
SELECT * FROM public.teachers WHERE email = 'admin@school.com';

-- 2. Check school assignment
SELECT school_id, school_name FROM public.teachers WHERE email = 'admin@school.com';

-- 3. Count teachers in admin's school
SELECT COUNT(*) as teacher_count 
FROM public.teachers 
WHERE school_id = (SELECT school_id FROM public.teachers WHERE email = 'admin@school.com')
AND role = 'teacher';

-- 4. Test RLS (should only see own school)
SELECT email, role FROM public.teachers WHERE school_id = 'admin-school-id';
```

---

## Next Steps After Admin Creation

1. ✅ Admin logs in and accesses `/admin`
2. ✅ Admin goes to `/admin/onboard`
3. ✅ Admin creates teacher accounts with enrollment codes
4. ✅ Admin shares enrollment codes with teachers
5. ✅ Teachers complete self-onboarding
6. ✅ Admin activates teacher accounts
7. ✅ Teachers can access the system

---

## Quick Reference

### Database Table: teachers

Key columns for admin setup:
- `email` - Admin's email (unique)
- `auth0_user_id` - Linked Auth0 account
- `role` - Set to 'admin'
- `is_active` - Must be true
- `school_id` - UUID for school isolation

### Auth0 Configuration

Required `app_metadata`:
```json
{
  "role": "admin"
}
```

Custom claim in token:
```
https://brightminds.ai4magic.com/role = "admin"
```

### Important URLs

- Admin Portal: `/admin`
- Teacher Management: `/admin/teachers`
- Onboard Teacher: `/admin/onboard`
- Announcements: `/admin/newsletters`

---

## Support

If you encounter issues:
1. Check browser console logs
2. Check Supabase SQL Editor for errors
3. Verify Auth0 configuration
4. Review this guide's troubleshooting section
5. Check database state with verification queries

