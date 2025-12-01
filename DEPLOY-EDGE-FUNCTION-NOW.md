# 🚀 Deploy Edge Function - Complete Guide

## Your Fixed Edge Function Code

Copy the ENTIRE code below and deploy it to Supabase Dashboard.

---

## 📋 STEP-BY-STEP DEPLOYMENT INSTRUCTIONS

### Step 1: Go to Edge Functions Page
1. Open your browser and go to: **https://supabase.com/dashboard**
2. Select your **BrightMinds** project
3. Click on **"Edge Functions"** in the left sidebar
4. You should see a list of existing functions (or empty if none)

### Step 2: Find or Create "assignments" Function
- **If you see "assignments" function:**
  - Click on it to open
  - Click **"Edit function"** button
  
- **If you DON'T see "assignments" function:**
  - Click **"Create a new function"** button
  - Name it: `assignments`
  - Click **"Create function"**

### Step 3: Copy the Fixed Code
1. Open the file: `supabase/functions/assignments/index.ts` in VS Code (already open in your workspace)
2. Select ALL the code (Ctrl+A)
3. Copy it (Ctrl+C)

**OR** use the code below (same content):

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const auth0UserId = url.searchParams.get('auth0_user_id') || 'mock-teacher-1';
    const assignmentId = url.searchParams.get('id');
    const roomId = url.searchParams.get('roomId');

    // Get teacher ID
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('auth0_user_id', auth0UserId)
      .single();

    if (!teacher) {
      return new Response(JSON.stringify({ error: 'Teacher not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const teacherId = teacher.id;

    if (req.method === 'GET') {
      let query = supabase
        .from('assignments')
        .select(`
          *,
          rooms (
            id,
            name
          ),
          games (
            id,
            name,
            game_type,
            game_path
          )
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (roomId) {
        query = query.eq('room_id', roomId);
      }

      const { data: assignments, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify(assignments || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      
      console.log('🚨🚨🚨 BACKEND DEBUG: Assignment creation request received! 🚨🚨🚨');
      console.log('📥 Assignment creation request body:', JSON.stringify(body, null, 2));
      console.log('🔍 Key fields received:');
      console.log(`   - roomType: ${body.roomType}`);
      console.log(`   - room_id: ${body.room_id} (type: ${typeof body.room_id})`);
      console.log(`   - roomValue: ${body.roomValue}`);
      console.log(`   - title: ${body.title}`);
      
      // CRITICAL: Check if room_id is actually present
      if (body.hasOwnProperty('room_id')) {
        console.log('✅ room_id field is present in request body');
        if (body.room_id) {
          console.log(`✅ room_id has value: ${body.room_id}`);
        } else {
          console.log('⚠️ room_id field is present but value is falsy:', body.room_id);
        }
      } else {
        console.log('❌ room_id field is MISSING from request body!');
      }
      
      // CRITICAL DEBUG: Check if room_id is being lost somewhere
      if (body.roomType === 'prebuilt' && body.room_id) {
        console.log('🎯 PRE-BUILT + ROOM ASSIGNMENT DETECTED:');
        console.log(`   Frontend sent room_id: ${body.room_id}`);
        console.log(`   This assignment SHOULD be restricted to students in room: ${body.room_id}`);
      } else if (body.roomType === 'prebuilt' && !body.room_id) {
        console.log('⚠️ PRE-BUILT WITHOUT ROOM ASSIGNMENT:');
        console.log(`   Frontend did NOT send room_id - assignment will be available to ALL students`);
      }
      
      let assignmentData;
      
      if (body.roomType === 'prebuilt') {
        // For pre-built game assignments
        console.log('Creating game assignment for game ID:', body.roomValue);
        
        const { data: game, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', body.roomValue)
          .single();
          
        if (gameError) {
          console.error('Game lookup error:', gameError);
          return new Response(JSON.stringify({ error: 'Game lookup failed', details: gameError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
          
        if (!game) {
          console.error('Game not found for ID:', body.roomValue);
          return new Response(JSON.stringify({ error: 'Game not found', gameId: body.roomValue }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        console.log('Found game:', game.name);
        
        assignmentData = {
          teacher_id: teacherId,
          title: body.title,
          description: body.description,
          due_date: body.dueDate || null,
          status: body.status || 'active',
          assignment_type: 'game',
          game_id: game.id,
          game_config: body.gameConfig || {},
          room_id: body.room_id || null, // Respect room assignment for game assignments
          // Always set top-level game_type for frontend reliability
          game_type: game.game_type || (body.gameConfig && body.gameConfig.game_type) || null
        };
        
        console.log('🎮 PRE-BUILT GAME ASSIGNMENT DATA:');
        console.log(`   - Game ID: ${game.id}`);
        console.log(`   - Room ID from body: ${body.room_id}`);
        console.log(`   - Final room_id: ${assignmentData.room_id}`);
        if (assignmentData.room_id) {
          console.log(`   ✅ Assignment will be LIMITED to students in room: ${assignmentData.room_id}`);
        } else {
          console.log(`   ⚠️ Assignment will be AVAILABLE TO ALL STUDENTS (no room restriction)`);
        }
      } else {
        // For custom assignments (question papers) or room assignments
        console.log('Creating custom assignment (question paper) or room assignment');
        console.log('📋 Received assignment_type:', body.assignment_type);
        console.log('📄 Received question_paper_id:', body.question_paper_id);
        console.log('📊 Received grade:', body.grade);
        
        assignmentData = {
          teacher_id: teacherId,
          room_id: body.room_id || null,
          title: body.title,
          description: body.description,
          due_date: body.dueDate || null,
          status: body.status || 'active',
          // Use the assignment_type sent from frontend, default to 'custom'
          assignment_type: body.assignment_type || 'custom',
          // Include question_paper_id for custom assignments
          question_paper_id: body.question_paper_id || null,
          // Include grade
          grade: body.grade || null
        };
        
        console.log('✅ Custom assignment data prepared:');
        console.log(`   - assignment_type: ${assignmentData.assignment_type}`);
        console.log(`   - question_paper_id: ${assignmentData.question_paper_id || 'NULL'}`);
        console.log(`   - grade: ${assignmentData.grade || 'NOT SET'}`);
        
        if (assignmentData.assignment_type === 'custom' && !assignmentData.question_paper_id) {
          console.warn('⚠️ WARNING: Custom assignment without question_paper_id!');
          console.warn('⚠️ Students will not be able to see questions!');
        }
      }

      console.log('📝 Assignment data to insert:', assignmentData);

      const { data: assignment, error } = await supabase
        .from('assignments')
        .insert(assignmentData)
        .select()
        .single();
        
      if (assignment) {
        console.log('✅ Assignment created successfully:');
        console.log(`   - Title: ${assignment.title}`);
        console.log(`   - Type: ${assignment.assignment_type}`);
        console.log(`   - Room ID: ${assignment.room_id || 'None (available to all students)'}`);
        console.log(`   - Teacher ID: ${assignment.teacher_id}`);
        
        // Verify room assignment if specified
        if (assignment.room_id) {
          console.log(`🔍 Verifying room assignment for room: ${assignment.room_id}`);
          
          // Get students in this room
          supabase
            .from('room_students')
            .select(`
              students!inner(
                name
              )
            `)
            .eq('room_id', assignment.room_id)
            .then(({ data: roomStudents }) => {
              const studentNames = roomStudents?.map(rs => rs.students?.name).join(', ') || 'No students';
              console.log(`   📊 Students in room ${assignment.room_id}: ${studentNames}`);
              console.log(`   ✅ Assignment "${assignment.title}" should ONLY be visible to: ${studentNames}`);
            });
        } else {
          console.log(`   ⚠️ No room assignment - this assignment will be visible to ALL students of teacher ${assignment.teacher_id}`);
        }
      }

      if (error) {
        console.error('Assignment insert error:', error);
        throw new Error(`Database insert failed: ${error.message} (Code: ${error.code})`);
      }

      console.log('Assignment created successfully:', assignment);
      console.log('🔍 VERIFICATION - Assignment saved with room_id:', assignment?.room_id);
      if (assignment?.room_id) {
        console.log(`✅ CONFIRMED: Assignment "${assignment.title}" is restricted to room ID: ${assignment.room_id}`);
      } else {
        console.log(`⚠️ WARNING: Assignment "${assignment.title}" has NO room restriction (available to all students)`);
      }

      return new Response(JSON.stringify(assignment), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT') {
      if (!assignmentId) {
        return new Response(JSON.stringify({ error: 'Assignment ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { data: assignment, error } = await supabase
        .from('assignments')
        .update(body)
        .eq('id', assignmentId)
        .eq('teacher_id', teacherId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(assignment), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      if (!assignmentId) {
        return new Response(JSON.stringify({ error: 'Assignment ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('teacher_id', teacherId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Step 4: Paste and Deploy
1. In the Supabase Dashboard function editor, **DELETE all existing code**
2. **PASTE** the code you just copied (entire code above)
3. Click **"Save"** or **"Deploy"** button (should be green button at top-right)
4. Wait for deployment to complete (usually 10-30 seconds)
5. You should see a success message: "Function deployed successfully"

### Step 5: Verify Deployment
1. In Supabase Dashboard, go to **Edge Functions** page
2. You should see `assignments` function listed
3. Status should show **"Active"** or **"Deployed"**
4. You'll see the deployment timestamp

---

## ✅ WHAT THIS FIX DOES

### The Problem (Before):
```typescript
// OLD CODE - HARDCODED VALUES ❌
assignmentData = {
  teacher_id: teacherId,
  room_id: body.room_id,
  title: body.title,
  description: body.description,
  due_date: body.dueDate || null,
  status: body.status || 'active',
  assignment_type: 'room' // ❌ ALWAYS 'room'!
  // ❌ question_paper_id NOT SAVED AT ALL!
  // ❌ grade NOT SAVED AT ALL!
};
```

### The Fix (After):
```typescript
// NEW CODE - DYNAMIC VALUES ✅
assignmentData = {
  teacher_id: teacherId,
  room_id: body.room_id || null,
  title: body.title,
  description: body.description,
  due_date: body.dueDate || null,
  status: body.status || 'active',
  assignment_type: body.assignment_type || 'custom', // ✅ FROM FRONTEND!
  question_paper_id: body.question_paper_id || null, // ✅ NOW SAVED!
  grade: body.grade || null // ✅ NOW SAVED!
};
```

**Key Changes:**
- Line 172: `assignment_type` now comes from frontend (not hardcoded as 'room')
- Line 174: `question_paper_id` now properly saved to database
- Line 176: `grade` now properly saved to database
- Lines 179-185: Added logging and warnings for debugging

---

## 🧪 TEST AFTER DEPLOYMENT

### Step 1: Create a New Assignment
1. Open your application: http://localhost:5173
2. Go to **Assignments** page
3. Click **"Create Assignment"**
4. Select **"Custom Assignment"** tab
5. Choose a question paper from dropdown
6. Fill in:
   - Title: "Test Assignment After Fix"
   - Description: "Testing Edge Function fix"
   - Grade: "Grade 10"
   - Due Date: Any future date
7. Open browser console (F12) BEFORE clicking create
8. Click **"Create Assignment"**

### Step 2: Check Console Logs
You should see in the browser console:

```
Frontend Debug:
assignment_type: "custom"
question_paper_id: "abc-123-def-..."
grade: "Grade 10"

Backend Response:
✅ Assignment created successfully
assignment_type: custom
question_paper_id: abc-123-def-...
```

### Step 3: Verify in Database
Run this query in Supabase SQL Editor:

```sql
SELECT id, title, assignment_type, question_paper_id, grade
FROM assignments
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result:**
- `assignment_type` = 'custom' (NOT 'room'!)
- `question_paper_id` = UUID (NOT NULL!)
- `grade` = 'Grade 10'

### Step 4: Test Student Portal
1. Go to **Student Portal** page
2. Refresh page (F5)
3. Open browser console
4. Look for your new assignment
5. You should see: `Will open modal?: ✅ YES`
6. Click **"Start Assignment"** button
7. **Modal should open** with questions!
8. Answer questions and submit
9. Score should be recorded

---

## 🎯 SUMMARY

**What You're Deploying:**
The fixed Edge Function that properly saves `assignment_type`, `question_paper_id`, and `grade` fields.

**Why This Fixes the Bug:**
The old code was ignoring these fields from the frontend and hardcoding `assignment_type: 'room'`. Now it respects all fields sent from frontend.

**Next Steps After Deployment:**
1. ✅ Deploy function (follow steps above)
2. ✅ Create new assignment via application
3. ✅ Verify in database
4. ✅ Test student portal modal
5. ✅ Verify question paper opens

**Time Required:**
- Deployment: 2-3 minutes
- Testing: 5 minutes
- **Total: ~10 minutes to complete fix!**

---

## 📞 Need Help?

If deployment fails or you see errors:
1. Check that you copied the ENTIRE code (all 305+ lines)
2. Make sure function name is exactly `assignments` (lowercase)
3. Check Supabase Dashboard logs under "Edge Functions" → "assignments" → "Logs"
4. Look for error messages in the deployment output

Once deployed successfully, your student portal will work! 🎉
