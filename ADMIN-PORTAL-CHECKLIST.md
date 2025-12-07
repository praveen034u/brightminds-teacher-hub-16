# Admin Portal - Implementation Checklist

Use this checklist to track your implementation progress.

---

## 📋 Pre-Implementation

- [ ] **Backup your database** before running migrations
- [ ] **Backup your code** in version control (git commit)
- [ ] **Review all documentation** files:
  - [ ] ADMIN-PORTAL-SUMMARY.md
  - [ ] ADMIN-PORTAL-QUICKSTART.md
  - [ ] ADMIN-PORTAL-IMPLEMENTATION-GUIDE.md
- [ ] **Verify dependencies** are installed (npm install)

---

## 🗄️ Database Setup

### Step 1: Run Migrations
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Copy entire content of `ADMIN-PORTAL-SETUP.sql`
- [ ] Execute SQL script
- [ ] Verify success message appears

### Step 2: Verify Database Changes
```sql
-- Run these verification queries:
```
- [ ] Profiles table has `role` column
- [ ] Profiles table has `is_active` column
- [ ] Profiles table has `school_id` column
- [ ] Announcements table exists
- [ ] RLS policies created for announcements
- [ ] Indexes created successfully

### Step 3: Update Existing Data
```sql
-- Update existing users to have teacher role
UPDATE profiles SET role = 'teacher' WHERE role IS NULL;
```
- [ ] All existing users have `role = 'teacher'`
- [ ] All existing users have `is_active = true`

---

## 🔐 Auth0 Configuration

### Step 1: Create Auth0 Action
- [ ] Go to Auth0 Dashboard → Actions → Library
- [ ] Click "Build Custom"
- [ ] Name: "Add BrightMinds Role to Token"
- [ ] Trigger: Login / Post Login
- [ ] Copy code from `AUTH0-ACTION-ADD-ROLE.js`
- [ ] Click "Deploy"

### Step 2: Add Action to Flow
- [ ] Go to Actions → Flows → Login
- [ ] Drag action into flow (after Start)
- [ ] Click "Apply"

### Step 3: Test Action
- [ ] Go to Actions → Flows → Login → Test
- [ ] Run test with sample user
- [ ] Verify token contains `https://brightminds/role` claim

### Step 4: Create Admin Users
For each admin user:
- [ ] Go to User Management → Users
- [ ] Select user
- [ ] Click Metadata tab
- [ ] Add to app_metadata:
  ```json
  {
    "role": "admin"
  }
  ```
- [ ] Save changes

---

## 🚀 Deploy Backend

### Step 1: Deploy Edge Functions
```bash
cd c:\SourceCode\BrightMinds-demo\brightminds-teacher-hub-16
```
- [ ] Deploy admin-teachers function:
  ```bash
  supabase functions deploy admin-teachers
  ```
- [ ] Deploy admin-reset-password function:
  ```bash
  supabase functions deploy admin-reset-password
  ```

### Step 2: Verify Deployment
- [ ] Check Supabase Dashboard → Edge Functions
- [ ] Both functions show as "Deployed"
- [ ] No deployment errors

### Step 3: Test Edge Functions (Optional)
- [ ] Test admin-teachers endpoint
- [ ] Test admin-reset-password endpoint
- [ ] Check function logs for errors

---

## 💻 Frontend Verification

### Step 1: Verify File Creation
All files created successfully:
- [ ] `src/components/routing/AdminRoute.tsx`
- [ ] `src/components/AnnouncementBanner.tsx`
- [ ] `src/pages/NotAuthorized.tsx`
- [ ] `src/pages/admin/AdminLayout.tsx`
- [ ] `src/pages/admin/AdminTeachers.tsx`
- [ ] `src/pages/admin/AdminNewsletters.tsx`

### Step 2: Verify File Modifications
- [ ] `src/context/AuthContext.tsx` updated
- [ ] `src/App.tsx` updated with admin routes
- [ ] `src/pages/TeacherHome.tsx` includes AnnouncementBanner

### Step 3: Build Check
```bash
npm run build
```
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No linting errors

---

## 🧪 Testing

### Test 1: Admin Access
- [ ] Log out completely
- [ ] Clear browser cache
- [ ] Log in with admin user
- [ ] Navigate to `/admin`
- [ ] Admin portal loads successfully
- [ ] Sidebar shows: Teachers, Announcements, Settings

### Test 2: Teacher Management
- [ ] Click "Teachers" in sidebar
- [ ] Teacher list displays
- [ ] Can view teacher details
- [ ] Can activate a teacher
- [ ] Can deactivate a teacher
- [ ] Success toast appears after actions

### Test 3: Announcement Management
- [ ] Click "Announcements" in sidebar
- [ ] Click "New Announcement" button
- [ ] Fill in announcement form:
  - Title: "Test Announcement"
  - Message: "This is a test message"
- [ ] Click "Create Announcement"
- [ ] Announcement appears in list
- [ ] Can activate/deactivate announcement

### Test 4: Teacher View
- [ ] Log out as admin
- [ ] Log in as teacher (role = "teacher")
- [ ] Navigate to `/dashboard`
- [ ] Announcement banner appears at top
- [ ] Can dismiss announcement
- [ ] Dismissed announcement doesn't reappear

### Test 5: Non-Admin Access
- [ ] As teacher user
- [ ] Try to access `/admin`
- [ ] Redirected to `/not-authorized`
- [ ] Error message displays
- [ ] Can navigate back to dashboard

### Test 6: Role Verification
- [ ] Check browser console for role logs
- [ ] Verify role extracted correctly from Auth0
- [ ] Verify role appears in user object

---

## 🔍 Security Verification

### Database Security
- [ ] RLS enabled on announcements table
- [ ] Admin can only see announcements from their school
- [ ] Teacher can only see active announcements
- [ ] Test cross-school data access (should fail)

### Route Security
- [ ] Non-authenticated users cannot access `/admin`
- [ ] Teachers cannot access `/admin`
- [ ] Only admins can access `/admin`
- [ ] Edge functions verify admin role

### Data Isolation
- [ ] Admin queries filter by school_id
- [ ] Teachers only see their school's data
- [ ] Cannot modify other school's data

---

## 📱 Cross-Browser Testing

- [ ] **Chrome**: Admin portal works
- [ ] **Firefox**: Admin portal works
- [ ] **Safari**: Admin portal works
- [ ] **Edge**: Admin portal works
- [ ] **Mobile Chrome**: Responsive layout
- [ ] **Mobile Safari**: Responsive layout

---

## 📊 Performance Check

- [ ] Page loads in < 2 seconds
- [ ] Announcements fetch quickly
- [ ] Teacher list loads fast
- [ ] No console errors
- [ ] No memory leaks
- [ ] Smooth transitions

---

## 📝 Documentation Review

- [ ] Read ADMIN-PORTAL-SUMMARY.md
- [ ] Read ADMIN-PORTAL-QUICKSTART.md
- [ ] Read ADMIN-PORTAL-IMPLEMENTATION-GUIDE.md
- [ ] Understand database schema changes
- [ ] Understand Auth0 configuration
- [ ] Know how to troubleshoot issues

---

## 🎯 Production Readiness

### Code Quality
- [ ] No console errors in production
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Code follows project conventions
- [ ] All imports resolve correctly

### Security
- [ ] RLS policies tested and working
- [ ] Role verification works on backend
- [ ] CORS configured correctly
- [ ] No sensitive data exposed
- [ ] SQL injection protected

### Performance
- [ ] Database indexes created
- [ ] Queries optimized
- [ ] No N+1 query problems
- [ ] Loading states implemented
- [ ] Error handling in place

### User Experience
- [ ] Loading indicators show
- [ ] Error messages are clear
- [ ] Success feedback provided
- [ ] Responsive on all devices
- [ ] Accessible to screen readers

---

## ✅ Final Sign-Off

- [ ] All tests pass
- [ ] All checklists complete
- [ ] Database migrations successful
- [ ] Auth0 configured correctly
- [ ] Edge functions deployed
- [ ] Admin user created
- [ ] Documentation reviewed
- [ ] Team trained on new features
- [ ] Backup created
- [ ] Ready for production deployment

---

## 🎉 Post-Deployment

- [ ] Monitor Supabase logs for errors
- [ ] Monitor Auth0 logs for issues
- [ ] Check user feedback
- [ ] Create first real announcement
- [ ] Train additional admins
- [ ] Schedule regular announcement reviews
- [ ] Plan future enhancements

---

## 📞 Emergency Contacts

**If something goes wrong:**

1. **Rollback Database:**
   - Restore from backup
   - Remove role column if needed

2. **Rollback Auth0:**
   - Remove Action from Login flow
   - Revert app_metadata changes

3. **Rollback Frontend:**
   - Git revert to previous commit
   - Redeploy application

4. **Support Resources:**
   - ADMIN-PORTAL-IMPLEMENTATION-GUIDE.md (Troubleshooting section)
   - Supabase Dashboard → Database → Backups
   - Auth0 Dashboard → Logs

---

**Date Started:** _____________  
**Date Completed:** _____________  
**Deployed By:** _____________  
**Sign-Off:** _____________

---

✅ **All items checked = Ready for Production!**
