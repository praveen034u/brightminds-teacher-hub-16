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
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Access token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify token and get student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('access_token', token)
      .single();

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Invalid access token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get student's rooms with detailed logging
    const { data: roomStudents, error: roomsError } = await supabase
      .from('room_students')
      .select(`
        room_id,
        rooms!inner(
          name
        )
      `)
      .eq('student_id', student.id);

    if (roomsError) throw roomsError;

    const roomIds = roomStudents?.map(rs => rs.room_id) || [];
    
    // Debug: Show exactly which rooms this student is in
    console.log(`🏠 ROOM MEMBERSHIP DEBUG for student ${student.name} (ID: ${student.id}):`);
    if (roomStudents && roomStudents.length > 0) {
      roomStudents.forEach(rs => {
        console.log(`   ✓ Room: ${rs.rooms?.name || 'Unknown'} (ID: ${rs.room_id})`);
      });
    } else {
      console.log(`   ❌ Student is not in any rooms`);
    }

    // Get room details
    const { data: rooms, error: roomDetailsError } = await supabase
      .from('rooms')
      .select('*')
      .in('id', roomIds);

    if (roomDetailsError) throw roomDetailsError;

    // Get teacher ID for this student (to fetch game assignments)
    const teacherId = student.teacher_id;

    // Get assignments for student's rooms AND game assignments from their teacher
    let assignmentQuery = supabase
      .from('assignments')
      .select(`
        *,
        games (
          id,
          name,
          game_type,
          game_path,
          categories,
          skills
        )
      `);

    // Build query to show only relevant assignments for this student
    console.log(`📚 Student ${student.name} (ID: ${student.id}) is in rooms:`, roomIds);
    console.log(`👨‍🏫 Student's teacher ID:`, teacherId);
    
    // FIXED: Proper room-based assignment filtering
    // This ensures students only see assignments they should have access to
    assignmentQuery = assignmentQuery.eq('teacher_id', teacherId);
    
    if (roomIds.length > 0) {
      // Build complex OR condition: (room assignments for student's rooms) OR (unassigned assignments)
      const roomConditions = `room_id.in.(${roomIds.join(',')})`;
      const unassignedConditions = `room_id.is.null`;
      assignmentQuery = assignmentQuery.or(`${roomConditions},${unassignedConditions}`);
      console.log(`🔍 Student with rooms [${roomIds.join(', ')}] - will see: room assignments for their rooms OR unassigned assignments`);
    } else {
      // For students not in any room: only show unassigned assignments
      assignmentQuery = assignmentQuery.is('room_id', null);
      console.log(`🎮 Student has no rooms - will only see unassigned assignments`);
    }

    console.log(`🔍 Final query being executed for student ${student.name}`);
    console.log(`🔍 Query conditions: teacher_id=${teacherId}, roomIds=[${roomIds.join(', ')}]`);
    
    const { data: assignments, error: assignmentsError } = await assignmentQuery
      .order('due_date', { ascending: true });

    if (assignmentsError) {
      console.error('❌ Assignment query error:', assignmentsError);
      throw assignmentsError;
    }
    
    // DEBUG: Log raw assignment data before processing
    console.log(`📊 RAW ASSIGNMENTS from database for student ${student.name}:`);
    if (assignments && assignments.length > 0) {
      assignments.forEach((a, index) => {
        console.log(`  ${index + 1}. "${a.title}" - Type: ${a.assignment_type}, Room: ${a.room_id || 'NULL'}, Game: ${a.game_id || 'N/A'}`);
        
        // Debug each assignment's room logic
        if (a.room_id) {
          const inRoom = roomIds.includes(a.room_id);
          console.log(`      🏠 Room Assignment Check:`);
          console.log(`         - Assignment room_id: ${a.room_id}`);
          console.log(`         - Student's room IDs: [${roomIds.join(', ')}]`);
          console.log(`         - Student in assignment room: ${inRoom ? '✅ YES' : '❌ NO'}`);
          if (!inRoom) {
            console.log(`         - ⚠️ THIS ASSIGNMENT SHOULD NOT BE VISIBLE TO STUDENT!`);
            console.log(`         - 🚨 BUG DETECTED: Assignment "${a.title}" shown to student not in room!`);
          }
        } else {
          console.log(`      🌐 Assignment has no room restriction (available to all students)`);
        }
        
        // Special debugging for the problematic assignment
        if (a.title === 'Both are assigned') {
          console.log(`🔴 DEBUGGING PROBLEMATIC ASSIGNMENT: "${a.title}"`);
          console.log(`   - Assignment ID: ${a.id}`);
          console.log(`   - Assignment room_id: ${a.room_id}`);
          console.log(`   - Assignment type: ${a.assignment_type}`);
          console.log(`   - Game ID: ${a.game_id}`);
          console.log(`   - Student ${student.name} room IDs: [${roomIds.join(', ')}]`);
          if (a.room_id === null) {
            console.log(`   🔍 REASON: Assignment has NO room assignment (room_id=NULL) - available to all students`);
          } else if (roomIds.includes(a.room_id)) {
            console.log(`   🔍 REASON: Student IS in the assigned room (${a.room_id})`);
          } else {
            console.log(`   🔍 REASON: 🚨 BUG - Student NOT in assigned room but still seeing assignment!`);
          }
        }
      });
    } else {
      console.log(`  No assignments found in database for this student`);
    }

    console.log(`📋 Found ${assignments?.length || 0} assignments for student ${student.name} (ID: ${student.id})`);
    if (assignments) {
      assignments.forEach(a => {
        const isInAssignmentRoom = roomIds.includes(a.room_id);
        const isGameAssignment = a.assignment_type === 'game';
        
        let reason;
        let shouldSee = false;
        
        if (isGameAssignment && a.room_id === null) {
          reason = 'Unassigned game assignment from teacher';
          shouldSee = true;
        } else if (isGameAssignment && isInAssignmentRoom) {
          reason = `Game assignment assigned to student's room (${a.room_id})`;
          shouldSee = true;
        } else if (isGameAssignment && !isInAssignmentRoom) {
          reason = `Game assignment assigned to different room (${a.room_id}) - student not in this room`;
          shouldSee = false;
        } else if (a.room_id === null) {
          reason = 'Unassigned room assignment (available to all)';
          shouldSee = true;
        } else if (isInAssignmentRoom) {
          reason = `Room assignment (student IS in room ${a.room_id})`;
          shouldSee = true;
        } else {
          reason = `🚨 BUG: Room assignment for room ${a.room_id} (student NOT in this room!) - Student rooms: [${roomIds.join(', ')}]`;
          shouldSee = false;
        }
        
        const prefix = shouldSee ? '  ✅' : '  ❌ BUG';
        console.log(`${prefix} ${a.title} (Type: ${a.assignment_type}, Room: ${a.room_id || 'None'}) - ${reason}`);
        
        // Additional verification for room assignments
        if (a.assignment_type === 'room' && a.room_id && !shouldSee) {
          console.log(`🚨 CRITICAL BUG DETECTED! Assignment "${a.title}" should NOT be visible to ${student.name}`);
          console.log(`   Assignment Room: ${a.room_id}`);
          console.log(`   Student Rooms: [${roomIds.join(', ')}]`);
          console.log(`   Student ID: ${student.id}`);
          console.log(`   Teacher ID: ${teacherId}`);
        }
      });
      
      // Double-check: verify room membership with direct query
      if (assignments.some(a => a.assignment_type === 'room' && a.room_id && !roomIds.includes(a.room_id))) {
        console.log(`🔍 VERIFICATION: Re-checking room membership for student ${student.name} (${student.id})`);
        const { data: verifyRooms } = await supabase
          .from('room_students')
          .select('room_id')
          .eq('student_id', student.id);
        console.log(`   Direct query result:`, verifyRooms?.map(r => r.room_id) || []);
      }
    }

    // Get assignment attempts for this student
    const assignmentIds = assignments?.map(a => a.id) || [];
    let attempts = [];
    if (assignmentIds.length > 0) {
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('assignment_attempts')
        .select('*')
        .eq('student_id', student.id)
        .in('assignment_id', assignmentIds);
      
      if (attemptsError) {
        console.warn('Error fetching assignment attempts:', attemptsError);
      } else {
        attempts = attemptsData || [];
      }
    }

    // Get all classmates (students in the same rooms)
    const { data: allRoomStudents, error: classmatesError } = await supabase
      .from('room_students')
      .select('student_id, room_id')
      .in('room_id', roomIds);

    if (classmatesError) throw classmatesError;

    // Get unique student IDs (excluding current student)
    const classmateIds = [...new Set(
      allRoomStudents?.map(rs => rs.student_id).filter(id => id !== student.id) || []
    )];

    // Get classmate details
    const { data: classmates, error: classmateDetailsError } = await supabase
      .from('students')
      .select('id, name, email, primary_language')
      .in('id', classmateIds);

    if (classmateDetailsError) throw classmateDetailsError;

    // Map classmates to their rooms
    const classmatesWithRooms = classmates?.map(classmate => {
      const studentRoomIds = allRoomStudents
        ?.filter(rs => rs.student_id === classmate.id)
        .map(rs => rs.room_id) || [];
      
      const sharedRooms = rooms?.filter(r => studentRoomIds.includes(r.id)) || [];
      
      return {
        ...classmate,
        rooms: sharedRooms,
        shared_room_count: sharedRooms.length
      };
    }) || [];

    // Prepare response
    const response = {
      id: student.id,
      name: student.name,
      email: student.email,
      primary_language: student.primary_language,
      rooms: rooms || [],
      assignments: assignments || [],
      assignmentAttempts: attempts || [],
      classmates: classmatesWithRooms,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in student-portal function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
