# Update Teacher Full Name

## Issue
The dashboard shows "Hello lalit_test@gmail.com! 👋" instead of the teacher's actual name because the `full_name` field in the database contains the email address.

## Solution Options

### Option 1: Update via Profile Page (RECOMMENDED)
1. Click on the teacher avatar (top right)
2. Select "Profile" from the dropdown
3. Update the "Full Name" field with the actual name (e.g., "Lalit Kumar")
4. Click "Save Changes"
5. Return to dashboard - it will now show "Hello Lalit Kumar! 👋"

### Option 2: Update via SQL (Quick Fix)
Run this SQL in Supabase SQL Editor to update the teacher's name directly:

```sql
-- Update the full_name for a specific teacher by email
UPDATE teachers 
SET full_name = 'Lalit Kumar'  -- Replace with actual teacher name
WHERE email = 'lalit_test@gmail.com';

-- Verify the update
SELECT id, email, full_name, school_name 
FROM teachers 
WHERE email = 'lalit_test@gmail.com';
```

### Option 3: Update Multiple Teachers at Once
If you have multiple teachers with email as their name:

```sql
-- Find all teachers where full_name looks like an email
SELECT id, email, full_name, school_name 
FROM teachers 
WHERE full_name LIKE '%@%';

-- Update them individually:
UPDATE teachers SET full_name = 'Teacher Name' WHERE email = 'email@domain.com';
-- Repeat for each teacher
```

## Why This Happened
When teachers first register, the system creates their profile using their email. The teacher needs to complete their profile by:
1. Adding their actual full name
2. Adding school name
3. Adding grades taught
4. Adding subjects

The profile completion redirect should prompt this, but if it was skipped, the email remains as the full name.

## Prevention
The profile page already has validation and prompts for completing the profile. Make sure teachers complete their profile setup when they first log in.

## Technical Details
- **File**: `src/pages/TeacherHome.tsx` (Line 158)
- **Code**: `Hello {user?.full_name || 'Teacher'}! 👋`
- **Database**: `teachers.full_name` column
- **Profile Page**: `/profile` route allows editing

The code is correct - it's the database data that needs updating.
