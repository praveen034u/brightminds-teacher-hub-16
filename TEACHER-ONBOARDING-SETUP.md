# Teacher Onboarding System - Setup Guide

## Overview
The admin can now create teacher accounts that teachers can claim and activate themselves. This eliminates the need for admins to set up Auth0 accounts manually.

## Features Implemented

### 1. **Admin: Onboard New Teacher** (`/admin/onboard`)
- Create teacher profiles with basic information
- Auto-generate enrollment codes (8-character unique codes)
- Send invitation emails to teachers
- No Auth0 setup required by admin

### 2. **Teacher: Self-Onboarding** (`/teacher-onboarding`)
- Enter enrollment code received via email
- Verify personal information
- Create Auth0 account
- Complete profile setup

### 3. **Teacher Management** (`/admin/teachers`)
- View all teachers (pending and active)
- See invitation status
- Activate/deactivate accounts

## Database Changes Required

Run this SQL in Supabase SQL Editor:

```sql
-- File: migrations/003-add-teacher-enrollment-fields.sql

ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS enrollment_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'completed')),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_teachers_enrollment_code ON public.teachers(enrollment_code);
CREATE INDEX IF NOT EXISTS idx_teachers_access_token ON public.teachers(access_token);
CREATE INDEX IF NOT EXISTS idx_teachers_invitation_status ON public.teachers(invitation_status);
```

## Email Integration (Optional)

The system includes a placeholder email function. To enable actual emails:

### Option 1: Resend (Recommended)

1. Sign up at https://resend.com
2. Get your API key
3. Update `supabase/functions/send-teacher-onboarding-email/index.ts`:

```typescript
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${RESEND_API_KEY}`,
  },
  body: JSON.stringify({
    from: "BrightMinds <onboarding@yourdomain.com>",
    to: [teacherEmail],
    subject: "Welcome to BrightMinds - Complete Your Setup",
    html: emailHtml,
  }),
});
```

4. Deploy edge function:
```bash
supabase functions deploy send-teacher-onboarding-email --project-ref your-project-ref
```

5. Set environment variable:
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx --project-ref your-project-ref
```

### Option 2: Manual Sharing (No Email Service)

The admin will see the enrollment code in a dialog after creating the teacher. They can:
- Copy the code
- Share it via Slack, WhatsApp, or other messaging
- Print it and give it physically

## User Flow

### Admin Flow:
1. Login as admin → Navigate to `/admin/onboard`
2. Fill in teacher details (name, email, grades, subjects)
3. Click "Create & Send Invitation"
4. System generates enrollment code
5. Email sent to teacher (or admin copies code manually)
6. Admin can track status in `/admin/teachers`

### Teacher Flow:
1. Receive email with enrollment code (e.g., `AB12CD34`)
2. Visit `/teacher-onboarding`
3. Enter enrollment code
4. Verify information is correct
5. Click "Create Account"
6. Redirected to Auth0 signup
7. Create account with email/password or social login
8. Redirected back to app
9. Profile automatically linked
10. Account activated by admin

## Routes Added

| Route | Access | Description |
|-------|--------|-------------|
| `/admin/onboard` | Admin only | Create new teacher invitations |
| `/teacher-onboarding` | Public | Teacher self-onboarding page |

## Components Created

1. **AdminOnboardTeacher.tsx** - Admin interface to create teachers
2. **TeacherOnboardingPage.tsx** - Teacher claim account page
3. **send-teacher-onboarding-email** - Edge function for emails

## Teacher Table Schema

New columns added:

| Column | Type | Description |
|--------|------|-------------|
| `enrollment_code` | TEXT | 8-char unique code (e.g., AB12CD34) |
| `access_token` | TEXT | Secure token for API access |
| `invitation_status` | TEXT | 'pending' or 'completed' |
| `invited_at` | TIMESTAMPTZ | When admin created invitation |
| `enrolled_at` | TIMESTAMPTZ | When teacher completed setup |

## Testing

### Test Admin Onboarding:
1. Login as admin
2. Go to `/admin/onboard`
3. Create a test teacher:
   - Name: Test Teacher
   - Email: test@example.com
   - Grades: 5, 6
   - Subjects: Mathematics, Science
4. Note the enrollment code shown in dialog

### Test Teacher Onboarding:
1. Logout (or use incognito mode)
2. Go to `/teacher-onboarding`
3. Enter the enrollment code from step 4 above
4. Verify information
5. Create Auth0 account
6. Should redirect to dashboard

### Verify in Admin Panel:
1. Login as admin
2. Go to `/admin/teachers`
3. New teacher should appear with status "completed"
4. Admin can activate the account

## Security Notes

1. **Enrollment codes are one-time use** - Once claimed, status changes to 'completed'
2. **Codes are unique** - Cannot be reused
3. **Auth0 handles authentication** - No passwords stored in database
4. **Admin approval required** - Teachers remain inactive until admin activates them
5. **RLS policies** - Ensure data security at database level

## Customization

### Change enrollment code format:
Edit `AdminOnboardTeacher.tsx`, function `generateEnrollmentCode()`:
```typescript
const generateEnrollmentCode = () => {
  // Customize: length, characters, format
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
```

### Customize email template:
Edit `supabase/functions/send-teacher-onboarding-email/index.ts`:
```typescript
const emailContent = `
  Your custom email template here...
  Code: ${enrollmentCode}
`;
```

### Auto-activate teachers:
Edit `AdminOnboardTeacher.tsx`, change:
```typescript
is_active: false,  // Change to true for auto-activation
```

## Troubleshooting

### Issue: Email not sending
**Solution:** Check Supabase function logs. For development, copy the code from the dialog and share manually.

### Issue: Enrollment code not working
**Solution:** 
- Check if code is exactly 8 characters
- Ensure teacher hasn't already claimed it (check `invitation_status`)
- Verify code exists in database

### Issue: Teacher can't create Auth0 account
**Solution:**
- Ensure Auth0 signup is enabled in dashboard
- Check Auth0 connection settings
- Verify email domain is not blocked

### Issue: Profile not linking after Auth0 signup
**Solution:**
- Check that `auth0_user_id` gets updated in teachers table
- Verify AuthContext is fetching by both auth0_user_id and email
- Check browser console for errors

## Next Steps

1. ✅ Run database migration
2. ✅ Test admin onboarding flow
3. ✅ Test teacher self-onboarding
4. ⬜ Set up email service (optional)
5. ⬜ Deploy edge function (if using email)
6. ⬜ Customize email templates
7. ⬜ Set up production domain in Auth0

## Support

For issues or questions:
- Check browser console logs
- Check Supabase function logs
- Review Auth0 logs
- Verify database records match expected state
