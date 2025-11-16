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
      
      console.log('Assignment creation request body:', body);
      
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
          room_id: null // No specific room for game assignments
        };
      } else {
        // For custom room assignments (existing logic)
        console.log('Creating room assignment');
        assignmentData = {
          teacher_id: teacherId,
          room_id: body.room_id,
          title: body.title,
          description: body.description,
          due_date: body.dueDate || null,
          status: body.status || 'active',
          assignment_type: 'room'
        };
      }

      console.log('Assignment data to insert:', assignmentData);

      const { data: assignment, error } = await supabase
        .from('assignments')
        .insert(assignmentData)
        .select()
        .single();

      if (error) {
        console.error('Assignment insert error:', error);
        throw new Error(`Database insert failed: ${error.message} (Code: ${error.code})`);
      }

      console.log('Assignment created successfully:', assignment);

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
    console.error('Error in assignments function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
