# Admin Portal - Quick Start Guide

Get your Admin Portal up and running in 5 minutes!

## 📋 Prerequisites

- ✅ Running BrightMinds Teacher Hub application
- ✅ Auth0 account with admin access
- ✅ Supabase project with database access

## 🚀 Quick Setup (5 Steps)

### Step 1: Database Setup (2 minutes)

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Copy and paste the entire contents of `ADMIN-PORTAL-SETUP.sql`
4. Click **RUN**
5. Wait for "Success" message

**Verification:**
```sql
-- Run this to verify setup
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('role', 'is_active', 'school_id');
-- Should return 3 rows
```

### Step 2: Auth0 Action Setup (3 minutes)

1. Go to **Auth0 Dashboard** → **Actions** → **Library**
2. Click **"Build Custom"**
3. Enter:
   - **Name:** `Add BrightMinds Role to Token`
   - **Trigger:** `Login / Post Login`
4. Copy and paste code from `AUTH0-ACTION-ADD-ROLE.js`
5. Click **"Deploy"**
6. Go to **Actions** → **Flows** → **Login**
7. **Drag** the action into the flow (between Start and Complete)
8. Click **"Apply"**

### Step 3: Create Your First Admin User (1 minute)

#### Option A: Using Auth0 Dashboard (Recommended)

1. Go to **User Management** → **Users**
2. Select a user (or create new one)
3. Click **"Metadata"** tab
4. Under **app_metadata**, add:
   ```json
   {
     "role": "admin"
   }
   ```
5. Click **"Save"**

#### Option B: Using Auth0 Management API

```bash
# Install Auth0 CLI (if not installed)
npm install -g auth0-cli

# Login
auth0 login

# Set user as admin
auth0 users update USER_ID --metadata '{"role":"admin"}'
```

### Step 4: Deploy Edge Functions (2 minutes)

```bash
# Navigate to your project directory
cd c:\SourceCode\BrightMinds-demo\brightminds-teacher-hub-16

# Deploy admin functions
supabase functions deploy admin-teachers
supabase functions deploy admin-reset-password
```

### Step 5: Test the Admin Portal (1 minute)

1. **Log out** of the application (to get fresh token with role)
2. **Log in** with your admin user
3. Navigate to: `/admin` or `http://localhost:5173/admin`
4. You should see the Admin Portal! 🎉

## 🎯 First Actions to Try

### 1. View Teachers
- Click **"Teachers"** in sidebar
- You should see all teachers in the system
- Try activating/deactivating a teacher

### 2. Create an Announcement
- Click **"Announcements"** in sidebar
- Click **"New Announcement"**
- Fill in:
  - Title: "Welcome to BrightMinds!"
  - Message: "We're excited to have you here."
- Click **"Create Announcement"**

### 3. Test Teacher View
- Log out
- Log in as a teacher (role = "teacher")
- Go to Dashboard
- You should see the announcement banner at the top!

## ❓ Troubleshooting

### Problem: "Access Denied" when accessing /admin

**Solution:**
```bash
# 1. Verify Auth0 Action is deployed
# Go to Auth0 → Actions → Flows → Login
# Confirm "Add BrightMinds Role to Token" is in the flow

# 2. Verify user has admin role
# Go to Auth0 → Users → [Your User] → Metadata
# Check app_metadata has: {"role": "admin"}

# 3. Clear cache and re-login
# Log out completely
# Clear browser cache
# Log in again
```

### Problem: Teachers list is empty

**Solution:**
```sql
-- Run this SQL to verify profiles table
SELECT id, full_name, email, role, is_active 
FROM profiles 
LIMIT 5;

-- If role column is missing, re-run setup script
-- If roles are NULL, update them:
UPDATE profiles SET role = 'teacher' WHERE role IS NULL;
```

### Problem: Announcements not showing

**Solution:**
```sql
-- Check if announcements table exists
SELECT * FROM announcements LIMIT 1;

-- If error, re-run migration 002:
-- Copy from: migrations/002-create-announcements-table.sql

-- Check if announcement is active
SELECT id, title, is_active, start_at, end_at 
FROM announcements;
```

## 🎓 Next Steps

### Add More Admins
Repeat Step 3 for each user you want to make an admin.

### Customize Announcements
Edit `src/components/AnnouncementBanner.tsx` to change the look and feel.

### Add Features
See `ADMIN-PORTAL-IMPLEMENTATION-GUIDE.md` for customization options.

### Configure Password Reset
Update `supabase/functions/admin-reset-password/index.ts` with your Auth0 credentials.

## 📚 Additional Resources

- **Full Documentation:** `ADMIN-PORTAL-IMPLEMENTATION-GUIDE.md`
- **Database Schema:** `migrations/001-add-role-to-profiles.sql` and `migrations/002-create-announcements-table.sql`
- **Auth0 Actions:** `AUTH0-ACTION-ADD-ROLE.js`

## ✅ Setup Checklist

- [ ] Database migrations executed
- [ ] Auth0 Action created and deployed
- [ ] Auth0 Action added to Login flow
- [ ] Admin user created (role = "admin")
- [ ] Edge functions deployed
- [ ] Tested admin access at `/admin`
- [ ] Created test announcement
- [ ] Verified announcement shows on teacher dashboard

## 🎉 You're All Set!

Your Admin Portal is now fully functional. Start managing teachers and creating announcements!

---

**Need Help?** Check the troubleshooting section above or refer to the full implementation guide.

**Version:** 1.0.0  
**Last Updated:** December 6, 2025
