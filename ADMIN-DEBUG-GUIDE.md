# Admin Role Debugging Guide

## Quick Check: Is Your Role Being Set?

### Step 1: Check Browser Console
1. Open your app and login as admin
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for these log messages:

```
🔍 Auth0 User Data:
  - role: "admin"  ← Should show "admin" not "teacher"
  - customClaim: "admin"  ← Should show "admin"
  - rawAuth0User: {...}

✅ Final teacher object with role:
  - role: "admin"  ← Should show "admin"
```

### Step 2: Verify Auth0 Token
In the console, the `rawAuth0User` object should contain:
```javascript
{
  "https://brightminds/role": "admin"
}
```

If you see `undefined` or `"teacher"`, the Auth0 Action is not working.

---

## Common Issues & Fixes

### Issue 1: Role is "teacher" instead of "admin"

**Cause:** Auth0 Action not injecting custom claim

**Fix:**
1. Go to Auth0 Dashboard → Actions → Flows → Login
2. Verify "Add BrightMinds Role to Token" action is in the flow
3. Check it's placed AFTER "Start" and BEFORE "Complete"
4. If missing, drag it from the right panel into the flow
5. Click "Apply" to save

### Issue 2: customClaim shows `undefined`

**Cause:** User's `app_metadata` doesn't have role set

**Fix:**
1. Go to Auth0 Dashboard → User Management → Users
2. Find your admin user
3. Scroll to **app_metadata** section
4. Click "Edit"
5. Add:
   ```json
   {
     "role": "admin"
   }
   ```
6. Save
7. **IMPORTANT:** Logout and login again to get new token

### Issue 3: Role shows correctly in console but still can't access /admin

**Cause:** Database `teachers` table doesn't have role set

**Fix:**
```sql
-- Check current role in database
SELECT id, email, role, is_active 
FROM teachers 
WHERE email = 'your-admin-email@example.com';

-- Update role in database
UPDATE teachers 
SET role = 'admin', is_active = true
WHERE email = 'your-admin-email@example.com';
```

### Issue 4: "Not Authorized" page shows

**Cause:** AdminRoute is rejecting access

**Fix:**
1. Check browser console for:
   ```
   🔐 AdminRoute check:
     - userRole: "admin"  ← Must be "admin"
   ```
2. If showing "teacher", go back to Issue 1 or Issue 2

---

## Step-by-Step Verification

### 1. Verify Auth0 Action is Deployed
```
Auth0 Dashboard → Actions → Library
  → Find "Add BrightMinds Role to Token"
  → Status should be "Deployed" (green)
```

### 2. Verify Action is in Login Flow
```
Auth0 Dashboard → Actions → Flows → Login
  → Should show: Start → Add BrightMinds Role → Complete
```

### 3. Verify User app_metadata
```
Auth0 Dashboard → User Management → Users → [Your User]
  → app_metadata section:
    {
      "role": "admin"
    }
```

### 4. Verify Database Role
```sql
SELECT 
  email,
  role,
  is_active,
  school_id,
  auth0_user_id
FROM teachers 
WHERE email = 'your-email@example.com';
```

Expected result:
```
email              | role  | is_active | school_id | auth0_user_id
-------------------|-------|-----------|-----------|---------------
admin@example.com  | admin | true      | uuid...   | auth0|123...
```

---

## Testing the Complete Flow

### Test 1: Check Auth0 Token
1. Login to your app
2. Open DevTools Console
3. Type:
   ```javascript
   JSON.parse(atob(localStorage.getItem('auth0.user').split('.')[1]))
   ```
4. Look for: `"https://brightminds/role": "admin"`

### Test 2: Check AuthContext
1. In Console, you should see:
   ```
   🔍 Auth0 User Data:
     role: "admin"
     customClaim: "admin"
   
   ✅ Final teacher object with role:
     role: "admin"
   ```

### Test 3: Check AdminRoute
1. Try accessing: `http://localhost:5173/admin`
2. In Console, you should see:
   ```
   🔐 AdminRoute check:
     isAuthenticated: true
     hasUser: true
     userRole: "admin"
   
   ✅ AdminRoute: Access granted
   ```

### Test 4: Navigation Menu
1. If you reach `/admin`, you should see:
   - Left sidebar with: Teachers, Announcements, School Settings
   - Top bar with: "Admin Portal" title
   - No teacher navigation (Students, Rooms, etc.)

---

## Emergency Reset

If nothing works, reset everything:

### 1. Clear Browser Data
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. Force Re-login
1. Logout from app
2. Go to: `https://dev-jbrriuc5vyjmiwtx.us.auth0.com/v2/logout`
3. Login again

### 3. Verify Auth0 Action Code
The Auth0 Action should have **exactly** this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const role = event.user.app_metadata?.role || 'teacher';
  
  console.log(`Adding role to token for user ${event.user.email}: ${role}`);
  
  api.idToken.setCustomClaim('https://brightminds/role', role);
  api.accessToken.setCustomClaim('https://brightminds/role', role);
};
```

### 4. Check Auth0 Action Logs
```
Auth0 Dashboard → Monitoring → Logs
  → Filter by: "Add BrightMinds Role"
  → Latest log should show your role being added
```

---

## Success Checklist

When everything is working correctly, you should see:

- ✅ Browser console shows `role: "admin"`
- ✅ `/admin` route is accessible (no redirect)
- ✅ Admin navigation menu visible (Teachers, Announcements)
- ✅ Teacher navigation NOT visible in admin portal
- ✅ Database shows `role = 'admin'` for your user
- ✅ Auth0 app_metadata shows `{"role": "admin"}`
- ✅ Auth0 Action deployed and in Login flow

---

## Still Not Working?

### Debug Output Required:

Please provide these console logs:

1. **Auth0 User Data:**
   ```
   🔍 Auth0 User Data: { ... }
   ```

2. **Final Teacher Object:**
   ```
   ✅ Final teacher object with role: { ... }
   ```

3. **AdminRoute Check:**
   ```
   🔐 AdminRoute check: { ... }
   ```

4. **Database Query Result:**
   ```sql
   SELECT email, role, is_active FROM teachers WHERE email = 'your-email';
   ```

5. **Auth0 app_metadata:**
   Screenshot of user's app_metadata from Auth0 Dashboard

With this information, we can pinpoint exactly where the role is being lost.
