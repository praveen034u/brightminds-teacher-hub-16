# Student Portal Feature - Implementation Guide

## Overview
This feature adds a secure student portal where students can access their assigned rooms and assignments via a unique access link, without requiring Auth0 authentication.

## What's New

### 1. Email Field for Students
- Students now have an optional `email` field
- Added to the student creation form
- Displayed in the students table

### 2. Automatic Access Token Generation
- Each student automatically gets a unique `access_token` when created
- Token is a secure 64-character hex string
- Tokens are unique and indexed for fast lookups

### 3. Student Access Links
- Each student has a unique URL: `/student-portal?token={access_token}`
- Teachers can copy this link with one click from the Students page
- Students can use this link to access their personalized portal

### 4. Student Portal Page
Features:
- **Welcome header** with student name and email
- **My Classrooms** section showing all assigned rooms
- **My Assignments** section showing:
  - Assignment title and description
  - Which classroom it belongs to
  - Due date and time
  - Status (active/overdue)
  - Visual indicators for overdue assignments
- **Help section** for contacting teachers

### 5. Security
- Students can ONLY see:
  - Their own profile information
  - Rooms they are assigned to
  - Assignments for their rooms
  - Their own help requests
- No access to other students' data
- No access to teacher functions
- Token-based authentication (no password required)

## Database Changes

### Migration Required
Run the SQL migration file in your Supabase SQL Editor:
```
migration-student-portal.sql
```

This will:
1. Add `email` column to students table
2. Add `access_token` column with unique constraint
3. Generate tokens for existing students
4. Create necessary RLS policies
5. Add performance indexes

## How to Use

### For Teachers:

1. **Create/Add Students**
   - Go to Students page
   - Click "Add Student"
   - Fill in student details (email is optional)
   - Student is automatically assigned a unique access token

2. **Share Student Access Links**
   - On the Students page, each student has a copy button (📋)
   - Click the copy button to copy the student's unique portal link
   - Share this link with the student via email, messaging, or printed handout
   - Each link is unique and tied to one student only

3. **Assign Students to Rooms**
   - Add students to rooms as usual
   - Students will automatically see these rooms in their portal

4. **Create Assignments**
   - Create assignments for rooms as usual
   - Students in those rooms will see the assignments in their portal

### For Students:

1. **Access the Portal**
   - Click the unique link provided by teacher
   - Format: `https://your-app.com/student-portal?token=abc123...`

2. **View Classrooms**
   - See all rooms you're assigned to
   - View room descriptions and grade levels

3. **View Assignments**
   - See all assignments from your rooms
   - Check due dates and descriptions
   - See which assignments are overdue (red badge)

## Files Modified/Created

### Frontend:
- ✅ `src/pages/StudentsPage.tsx` - Added email field and copy link button
- ✅ `src/pages/StudentPortalPage.tsx` - NEW: Student portal page
- ✅ `src/App.tsx` - Added student portal route

### Backend:
- ✅ `supabase/functions/students/index.ts` - Added access URL generation
- ✅ `supabase/functions/student-portal/index.ts` - NEW: Student data API
- ✅ `supabase/config.toml` - Added student-portal function config

### Database:
- ✅ `database-schema.sql` - Updated with email and access_token fields
- ✅ `migration-student-portal.sql` - NEW: Migration for existing databases

## Testing the Feature

### Test Scenario 1: Create New Student
1. Go to Students page
2. Click "Add Student"
3. Add name: "Test Student", email: "test@example.com"
4. Click "Add Student"
5. See the copy link button appears
6. Click copy button - link copied to clipboard!

### Test Scenario 2: Student Portal Access
1. Copy a student's access link
2. Open in new browser tab (or incognito)
3. Should see student's name and welcome message
4. Should see all assigned rooms
5. Should see all assignments for those rooms

### Test Scenario 3: Security Check
1. Try accessing portal without token: `/student-portal`
   - Should show "Access Denied" error
2. Try with invalid token: `/student-portal?token=invalid`
   - Should show "Invalid access token" error
3. Students should NOT see:
   - Other students' data
   - Teacher controls
   - Unassigned rooms

## Deployment Steps Completed

✅ 1. Database schema updated
✅ 2. Student portal Edge Function deployed
✅ 3. Students Edge Function redeployed
✅ 4. Frontend routes configured
✅ 5. UI components created

## Next Steps for You

1. **Run the database migration:**
   ```sql
   -- Go to Supabase Dashboard > SQL Editor
   -- Copy and run: migration-student-portal.sql
   ```

2. **Test the feature:**
   - Create a test student with email
   - Copy their access link
   - Open in incognito/new browser
   - Verify student can see their rooms and assignments

3. **Share links with students:**
   - You can email the links
   - Print QR codes for classroom
   - Share via your school's LMS

## Tips

- **Email Collection**: Email is optional but recommended for communication
- **Link Security**: Each link is unique - don't share one student's link with others
- **Link Lifetime**: Links don't expire (unless you regenerate the token)
- **Mobile Friendly**: Portal works on phones and tablets
- **No Login Required**: Students just click the link - no password needed!

## Future Enhancements (Optional)

- Add ability to submit assignments through portal
- Student help request creation
- Progress tracking
- Notifications when new assignments are posted
- File attachments for assignments
- Comments/feedback on assignments

---

**Need help?** Check the console for errors or contact your development team.
