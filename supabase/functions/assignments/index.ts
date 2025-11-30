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
    console.error('Error in assignments function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
