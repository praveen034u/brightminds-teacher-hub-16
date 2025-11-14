import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const roomId = url.searchParams.get('id');
    const action = url.searchParams.get('action');

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
      // List all rooms for teacher with student counts
      const { data: rooms, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_students (
            student_id
          )
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const roomsWithCounts = rooms?.map((room: any) => ({
        ...room,
        student_count: room.room_students?.length || 0,
        room_students: undefined,
      }));

      return new Response(JSON.stringify(roomsWithCounts || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      if (action === 'assign-students') {
        const body = await req.json();
        const { roomId: targetRoomId, studentIds } = body;

        // First, remove all existing students from this room
        await supabase
          .from('room_students')
          .delete()
          .eq('room_id', targetRoomId);

        // Then add the new student assignments
        if (studentIds && studentIds.length > 0) {
          const assignments = studentIds.map((studentId: string) => ({
            room_id: targetRoomId,
            student_id: studentId,
          }));

          const { error } = await supabase
            .from('room_students')
            .insert(assignments);

          if (error) throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create new room
      const body = await req.json();
      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          ...body,
          teacher_id: teacherId,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(room), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT') {
      if (!roomId) {
        return new Response(JSON.stringify({ error: 'Room ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { data: room, error } = await supabase
        .from('rooms')
        .update(body)
        .eq('id', roomId)
        .eq('teacher_id', teacherId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(room), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      if (!roomId) {
        return new Response(JSON.stringify({ error: 'Room ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)
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
    console.error('Error in rooms function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
