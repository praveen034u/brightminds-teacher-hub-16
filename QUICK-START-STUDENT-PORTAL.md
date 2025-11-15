# Student Portal - Quick Setup Guide

## ⚡ Quick Start (3 Steps)

### Step 1: Run Database Migration
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/lfsmtsnakdaukxgrqynk/editor
2. Click "SQL Editor" in left sidebar
3. Click "New Query"
4. Copy and paste contents of `migration-student-portal.sql`
5. Click "Run" or press Ctrl+Enter
6. ✅ Should see "Success. No rows returned"

### Step 2: Test the Feature
1. Start your dev server: `npm run dev`
2. Login to your teacher account
3. Go to Students page
4. Add a new student with:
   - Name: "Test Student"
   - Email: "test@student.com"
5. Click the blue copy button (📋) next to the student
6. ✅ "Student access link copied to clipboard!" message appears

### Step 3: Test Student Portal
1. Open a new incognito/private browser window
2. Paste the copied link
3. ✅ You should see:
   - "Welcome, Test Student!" header
   - Student's email displayed
   - "My Classrooms" section
   - "My Assignments" section

## 🎯 Feature Highlights

### Teacher View - Students Page
```
┌─────────────────────────────────────────────────────┐
│ All Students (3)                                     │
├─────────────────────────────────────────────────────┤
│ Name     │ Email          │ Gender │ ...│ Actions   │
├─────────────────────────────────────────────────────┤
│ John Doe │ john@email.com │ Male   │ ...│ 📋 🗑️   │
│ Jane S.  │ jane@email.com │ Female │ ...│ 📋 🗑️   │
└─────────────────────────────────────────────────────┘
        📋 = Copy student's access link
        🗑️ = Delete student
```

### Student Portal View
```
┌───────────────────────────────────────────────────┐
│ 👤 Welcome, John Doe!                             │
│    john@email.com                      [Active]   │
└───────────────────────────────────────────────────┘

🏠 My Classrooms
┌─────────────────────┐  ┌─────────────────────┐
│ Math Class          │  │ Science Lab         │
│ Grade 5             │  │ Grade 5             │
│ Learn mathematics   │  │ Hands-on science    │
│ 📚 2 assignments    │  │ 📚 1 assignment     │
└─────────────────────┘  └─────────────────────┘

📚 My Assignments
┌──────────────────────────────────────────────────┐
│ Homework Chapter 5                    [Active]   │
│ 🏠 Math Class                                    │
│ Complete exercises 1-10 from textbook            │
│ 📅 Due: 11/20/2025  🕐 5:00 PM                  │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│ Plant Growth Project                  [Overdue]  │
│ 🏠 Science Lab                                   │
│ Observe and document plant growth                │
│ 📅 Due: 11/13/2025  🕐 3:00 PM                  │
└──────────────────────────────────────────────────┘
```

## 🔒 Security Features

✅ **Token-Based Access**
- Each student gets unique 64-char token
- No password needed
- Tokens don't expire (until regenerated)

✅ **Data Isolation**
- Students only see THEIR data
- Cannot access other students' info
- Cannot modify teacher data
- RLS policies enforce security

✅ **No Auth Required**
- Students don't need to create account
- Just click the link
- Works on any device

## 📋 How Teachers Share Links

### Option 1: Email
```
Subject: Your BrightMinds Classroom Access

Hi John,

Click this link to access your classroom:
https://yourapp.com/student-portal?token=abc123...

See you in class!
Mrs. Sharma
```

### Option 2: QR Code
- Generate QR code from the URL
- Print and give to student
- Student scans with phone

### Option 3: LMS Integration
- Copy link
- Paste in Google Classroom, Canvas, etc.
- Students click from LMS

## 🐛 Troubleshooting

### "Access Denied" Error
- Check if token parameter is in URL
- URL should have `?token=...`
- Copy link again from Students page

### "Invalid access token" Error
- Token might be incorrect
- Generate new link from Students page
- Make sure full URL is copied

### Student sees no rooms/assignments
- Check if student is assigned to rooms
- Verify assignments exist for those rooms
- Assignments must be "active" status

### No copy button visible
- Refresh the Students page
- Check if student was created successfully
- Access token should auto-generate

## 📊 What Students Can Do

✅ **Can Do:**
- View assigned classrooms
- See all assignments for their rooms
- Check assignment due dates
- See which assignments are overdue
- Read assignment descriptions

❌ **Cannot Do:**
- See other students' data
- Access rooms they're not in
- See teacher dashboard
- Modify assignments
- Delete anything

## 🚀 Next Steps

After testing works:

1. **Add real students**
   - Enter actual student names and emails
   - Assign them to appropriate rooms

2. **Create assignments**
   - Students will see them immediately

3. **Share links**
   - Copy links for each student
   - Send via preferred method

4. **Monitor usage**
   - Check Supabase logs
   - See which students access portal

## 💡 Pro Tips

1. **Bookmark Links**: Students can bookmark their portal link
2. **Print Handouts**: Print links on paper for young students
3. **Parent Access**: Share link with parents for homework monitoring
4. **Desktop Shortcuts**: Create desktop shortcut to portal link
5. **Class Website**: Embed links in class website

---

**Everything is ready to use!** 🎉

Just run the migration SQL and start creating students!
