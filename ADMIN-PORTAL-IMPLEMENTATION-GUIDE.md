# Admin Portal Implementation Guide

## Overview

This guide describes the complete Admin Portal implementation for BrightMinds Teacher Hub. The Admin Portal is integrated into the same codebase and uses role-based access control (RBAC) with Auth0.

---

## 🎯 Features Implemented

### 1. **Role-Based Authentication**
- Auth0 integration with custom role claim: `https://brightminds/role`
- Two roles supported: `admin` and `teacher`
- Role is extracted from Auth0 ID token and merged with user profile
- Protected routes based on role

### 2. **Admin Portal Pages**
- **Teachers Management**: View, activate/deactivate teachers, send password reset
- **Announcements**: Create and manage announcements visible to teachers/students
- **School Settings**: Placeholder for future features

### 3. **Announcement System**
- Admins can create announcements with custom titles and messages
- Announcements support different audiences: all, teachers, students
- Active announcements displayed as banners on teacher dashboard
- Teachers can dismiss announcements (saved to localStorage)

---

## 📁 Files Created

### Components
```
src/components/routing/AdminRoute.tsx          # Admin-only route protection
src/components/AnnouncementBanner.tsx          # Banner component for announcements
```

### Pages
```
src/pages/NotAuthorized.tsx                    # Access denied page
src/pages/admin/AdminLayout.tsx                # Admin portal layout with sidebar
src/pages/admin/AdminTeachers.tsx              # Teacher management page
src/pages/admin/AdminNewsletters.tsx           # Announcement management page
```

### Database Migrations
```
migrations/001-add-role-to-profiles.sql        # Adds role, is_active, school_id columns
migrations/002-create-announcements-table.sql  # Creates announcements table with RLS
```

### API Endpoints (Supabase Edge Functions)
```
supabase/functions/admin-teachers/index.ts     # Teacher management API
supabase/functions/admin-reset-password/index.ts # Password reset API (placeholder)
```

---

## 🔧 Files Modified

### 1. `src/context/AuthContext.tsx`
**Changes:**
- Added `role?: 'admin' | 'teacher'` to Teacher interface
- Added `school_id?: string` to Teacher interface
- Extract role from Auth0 token claim: `https://brightminds/role`
- Default role to `teacher` if not specified
- Merge role into user profile from Auth0

### 2. `src/App.tsx`
**Changes:**
- Import AdminRoute, NotAuthorized, AdminLayout, AdminTeachers, AdminNewsletters
- Add `/not-authorized` route
- Add `/admin` nested routes with AdminRoute protection:
  - `/admin` → AdminTeachers (default)
  - `/admin/teachers` → AdminTeachers
  - `/admin/newsletters` → AdminNewsletters

### 3. `src/pages/TeacherHome.tsx`
**Changes:**
- Import AnnouncementBanner component
- Add `<AnnouncementBanner />` at the top of the main content

---

## 🗄️ Database Schema Changes

### 1. Profiles Table (Modified)
```sql
ALTER TABLE profiles
  ADD COLUMN role text NOT NULL DEFAULT 'teacher',
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN school_id uuid;

-- Constraint: role must be 'admin' or 'teacher'
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'teacher'));
```

### 2. Announcements Table (New)
```sql
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'banner',
  audience text NOT NULL DEFAULT 'all',
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**RLS Policies:**
- Admins can do everything with announcements in their school
- Teachers/students can read active announcements for their audience

---

## 🚀 Deployment Steps

### Step 1: Run Database Migrations

Execute the SQL migrations in order:

```bash
# Navigate to your Supabase project dashboard
# Go to SQL Editor and run:

# 1. First migration - Add role to profiles
# Copy and paste contents of: migrations/001-add-role-to-profiles.sql

# 2. Second migration - Create announcements table
# Copy and paste contents of: migrations/002-create-announcements-table.sql
```

Or using Supabase CLI:
```bash
supabase db push
```

### Step 2: Configure Auth0

#### A. Create Auth0 Action to Add Role Claim

1. Go to Auth0 Dashboard → Actions → Flows
2. Click on "Login"
3. Create a new Action called "Add Role to Token"
4. Add this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  // Option 1: Get role from user's app_metadata
  const role = event.user.app_metadata?.role || 'teacher';
  
  // Option 2: Get role from a database lookup (if you store roles elsewhere)
  // const role = await fetchUserRole(event.user.user_id);
  
  // Add role to ID token
  api.idToken.setCustomClaim('https://brightminds/role', role);
  
  // Optionally add to access token as well
  api.accessToken.setCustomClaim('https://brightminds/role', role);
};
```

5. Save and deploy the Action
6. Add it to the Login flow

#### B. Set User Roles in Auth0

For each user, set their role in `app_metadata`:

1. Go to User Management → Users
2. Select a user
3. Scroll to "Metadata"
4. In `app_metadata`, add:
```json
{
  "role": "admin"
}
```

Or use Auth0 Management API:
```javascript
const ManagementClient = require('auth0').ManagementClient;

const management = new ManagementClient({
  domain: 'YOUR_AUTH0_DOMAIN',
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET'
});

// Set user as admin
await management.updateAppMetadata(
  { id: 'USER_ID' },
  { role: 'admin' }
);
```

### Step 3: Deploy Supabase Edge Functions

```bash
# Deploy admin-teachers function
supabase functions deploy admin-teachers

# Deploy admin-reset-password function
supabase functions deploy admin-reset-password
```

### Step 4: Update Environment Variables (Optional)

If you want to implement actual password reset functionality, add these to your Supabase Edge Functions secrets:

```bash
supabase secrets set AUTH0_DOMAIN=your-domain.auth0.com
supabase secrets set AUTH0_CLIENT_ID=your-client-id
supabase secrets set AUTH0_CLIENT_SECRET=your-client-secret
supabase secrets set APP_URL=https://your-app-url.com
```

### Step 5: Test the Implementation

1. **Create an admin user**:
   - Set role to `admin` in Auth0 app_metadata
   - Log in to the application
   - Navigate to `/admin`

2. **Test teacher management**:
   - View list of teachers
   - Activate/deactivate teachers
   - Try password reset (placeholder)

3. **Test announcements**:
   - Create a new announcement
   - Activate/deactivate announcements
   - Log in as a teacher and verify banner appears on dashboard

---

## 🎨 Usage Guide

### For Admins

#### Accessing Admin Portal
1. Log in with admin credentials
2. Navigate to `/admin` or click "Admin Portal" from navigation
3. Use the sidebar to navigate between sections

#### Managing Teachers
1. Go to Admin → Teachers
2. View all teachers in your school
3. Activate/deactivate teacher accounts
4. Send password reset emails (requires backend integration)

#### Creating Announcements
1. Go to Admin → Announcements
2. Click "New Announcement"
3. Fill in:
   - **Title**: Short heading for the announcement
   - **Message**: Full announcement text
   - **Type**: Currently "banner" (default)
   - **Audience**: Currently "all" (future: teachers/students)
4. Click "Create Announcement"
5. Toggle active/inactive status as needed

### For Teachers

#### Viewing Announcements
- Active announcements appear as a banner at the top of the dashboard
- Click the X button to dismiss an announcement
- Dismissed announcements are saved locally and won't show again

---

## 🔐 Security Features

### Row Level Security (RLS)
- **Announcements**: 
  - Admins can CRUD announcements in their school
  - Teachers/students can only read active announcements
  
### Route Protection
- **AdminRoute**: Blocks access if user is not admin
- **ProtectedRoute**: Blocks access if user is not authenticated

### Data Isolation
- All queries filter by `school_id` to prevent cross-school data access
- Admin actions are scoped to their own school only

---

## 🛠️ Customization Options

### Adding More Admin Features

1. **Create new admin page**:
```tsx
// src/pages/admin/AdminSettings.tsx
import { useAuth } from '@/context/AuthContext';

const AdminSettings = () => {
  const { user } = useAuth();
  
  return (
    <div>
      <h2>School Settings</h2>
      {/* Your settings UI */}
    </div>
  );
};

export default AdminSettings;
```

2. **Add route in App.tsx**:
```tsx
<Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
  {/* ... existing routes ... */}
  <Route path="settings" element={<AdminSettings />} />
</Route>
```

3. **Update AdminLayout sidebar**:
```tsx
const navigation = [
  // ... existing items ...
  { name: 'School Settings', href: '/admin/settings', icon: Settings, disabled: false },
];
```

### Implementing Real Password Reset

Update `supabase/functions/admin-reset-password/index.ts`:

#### Option A: Using Auth0 Management API
```typescript
// Get Management API token
const tokenResponse = await fetch(`https://${auth0Domain}/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: Deno.env.get("AUTH0_CLIENT_ID"),
    client_secret: Deno.env.get("AUTH0_CLIENT_SECRET"),
    audience: `https://${auth0Domain}/api/v2/`,
    grant_type: 'client_credentials'
  })
});

const { access_token } = await tokenResponse.json();

// Send password reset email
const resetResponse = await fetch(
  `https://${auth0Domain}/api/v2/tickets/password-change`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      connection_id: 'Username-Password-Authentication'
    })
  }
);
```

#### Option B: Using Supabase Auth
```typescript
const { error } = await supabaseClient.auth.resetPasswordForEmail(
  email,
  {
    redirectTo: `${Deno.env.get("APP_URL")}/reset-password`,
  }
);
```

### Customizing Announcement Types

Modify `announcements` table constraints:
```sql
-- Add more types
ALTER TABLE announcements
DROP CONSTRAINT announcements_type_check;

ALTER TABLE announcements
ADD CONSTRAINT announcements_type_check 
CHECK (type IN ('banner', 'notification', 'alert', 'urgent'));
```

Update UI to support selection:
```tsx
// In AdminNewsletters.tsx
<select value={formData.type} onChange={...}>
  <option value="banner">Banner</option>
  <option value="notification">Notification</option>
  <option value="alert">Alert</option>
  <option value="urgent">Urgent</option>
</select>
```

---

## 🐛 Troubleshooting

### Issue: "Access Denied" when accessing /admin

**Solution:**
1. Verify Auth0 Action is deployed and added to Login flow
2. Check user's `app_metadata` has `role: "admin"`
3. Clear browser cache and log in again
4. Check browser console for role extraction logs

### Issue: Announcements not showing

**Solution:**
1. Verify announcements table exists: Run migration 002
2. Check announcement is active: `is_active = true`
3. Verify `school_id` matches user's school
4. Check `start_at` is in the past
5. Check browser localStorage for dismissed announcements

### Issue: Teachers list is empty

**Solution:**
1. Verify profiles table has `role` column: Run migration 001
2. Update existing teachers: `UPDATE profiles SET role = 'teacher'`
3. Verify `school_id` matches between admin and teachers
4. Check RLS policies are not blocking queries

---

## 📊 Database Indexes

For optimal performance, the following indexes are created:

```sql
-- Profiles table
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_school_id ON profiles(school_id);

-- Announcements table
CREATE INDEX idx_announcements_school_id ON announcements(school_id);
CREATE INDEX idx_announcements_is_active ON announcements(is_active);
CREATE INDEX idx_announcements_audience ON announcements(audience);
CREATE INDEX idx_announcements_active_school_audience 
  ON announcements(school_id, is_active, audience, start_at DESC);
```

---

## 🎓 Best Practices

1. **Always use school_id filtering** in admin queries to prevent data leaks
2. **Log admin actions** for audit purposes (future enhancement)
3. **Validate role on both client and server** (never trust client-side checks)
4. **Use RLS policies** as the last line of defense
5. **Keep announcement messages concise** for better UX
6. **Test with multiple roles** before deploying to production

---

## 🔮 Future Enhancements

- [ ] Admin dashboard with analytics
- [ ] Bulk teacher import/export
- [ ] Advanced announcement scheduling
- [ ] Email notifications for announcements
- [ ] Announcement read receipts
- [ ] Multi-school management for super admins
- [ ] Audit log for admin actions
- [ ] Custom roles and permissions
- [ ] Teacher performance metrics
- [ ] School settings management

---

## 📝 Notes

- All timestamps use `timestamptz` for timezone support
- Announcements support soft deletion via `is_active`
- Password reset is a placeholder - implement with Auth0 or Supabase Auth
- LocalStorage is used for dismissed announcements (consider moving to database)
- Role claim uses namespaced format to avoid conflicts: `https://brightminds/role`

---

## 🤝 Support

For questions or issues:
1. Check the troubleshooting section
2. Review browser console logs
3. Check Supabase logs for edge function errors
4. Verify Auth0 Action logs

---

**Implementation Date:** December 6, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete and Ready for Deployment
