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

    // Get student's rooms
    const { data: roomStudents, error: roomsError } = await supabase
      .from('room_students')
      .select('room_id')
      .eq('student_id', student.id);

    if (roomsError) throw roomsError;

    const roomIds = roomStudents?.map(rs => rs.room_id) || [];

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

    // Build the OR condition based on whether student has rooms
    if (roomIds.length > 0) {
      assignmentQuery = assignmentQuery.or(`room_id.in.(${roomIds.join(',')}),and(assignment_type.eq.game,teacher_id.eq.${teacherId})`);
    } else {
      // If student has no rooms, only get game assignments from their teacher
      assignmentQuery = assignmentQuery.eq('assignment_type', 'game').eq('teacher_id', teacherId);
    }

    const { data: assignments, error: assignmentsError } = await assignmentQuery
      .order('due_date', { ascending: true });

    if (assignmentsError) throw assignmentsError;

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
