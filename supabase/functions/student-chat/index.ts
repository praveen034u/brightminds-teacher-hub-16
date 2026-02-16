import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

type Requester =
  | { type: 'student'; student: any }
  | { type: 'teacher'; teacher: any };

async function getRequester(supabase: ReturnType<typeof createClient>, req: Request): Promise<Requester | null> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const auth0UserId = url.searchParams.get('auth0_user_id');

  if (token) {
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('access_token', token)
      .single();
    if (!student) return null;
    return { type: 'student', student };
  }

  if (auth0UserId) {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('*')
      .eq('auth0_user_id', auth0UserId)
      .single();
    if (!teacher) return null;
    return { type: 'teacher', teacher };
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const roomId = url.searchParams.get('room_id');
    const action = url.searchParams.get('action');
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitParam || 50), 1), 200);

    const requester = await getRequester(supabase, req);
    if (!requester) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing token or auth0_user_id' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      // Unread count for teacher
      if (action === 'unread') {
        if (!roomId) {
          return new Response(JSON.stringify({ error: 'room_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (requester?.type !== 'teacher') {
          return new Response(JSON.stringify({ error: 'Forbidden: teacher only' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // get last_read_at
        const { data: reads } = await supabase
          .from('chat_reads')
          .select('last_read_at')
          .eq('room_id', roomId)
          .eq('teacher_id', requester.teacher.id)
          .maybeSingle();

        const lastReadAt = reads?.last_read_at || null;
        let query = supabase
          .from('chat_messages')
          .select('id, created_at')
          .eq('room_id', roomId)
          .eq('sender_type', 'student');
        if (lastReadAt) query = query.gt('created_at', lastReadAt);
        const { data: msgs } = await query;
        const unreadCount = (msgs || []).length;
        return new Response(JSON.stringify({ unread_count: unreadCount, last_read_at: lastReadAt }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!roomId) {
        return new Response(JSON.stringify({ error: 'room_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Basic authorization: ensure student is member of room or teacher owns the room
      if (requester.type === 'student') {
        const { data: membership } = await supabase
          .from('room_students')
          .select('room_id')
          .eq('room_id', roomId)
          .eq('student_id', requester.student.id)
          .maybeSingle();
        if (!membership) {
          return new Response(JSON.stringify({ error: 'Forbidden: not a member of this room' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        const { data: room } = await supabase
          .from('rooms')
          .select('id, teacher_id')
          .eq('id', roomId)
          .single();
        if (!room || room.teacher_id !== requester.teacher.id) {
          return new Response(JSON.stringify({ error: 'Forbidden: not teacher of this room' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return new Response(JSON.stringify(messages || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { room_id, content, sender_name } = body || {};
      if (!room_id || !content) {
        return new Response(JSON.stringify({ error: 'room_id and content are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Authorization checks
      if (requester.type === 'student') {
        const { data: membership } = await supabase
          .from('room_students')
          .select('room_id')
          .eq('room_id', room_id)
          .eq('student_id', requester.student.id)
          .maybeSingle();
        if (!membership) {
          return new Response(JSON.stringify({ error: 'Forbidden: not a member of this room' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        const { data: room } = await supabase
          .from('rooms')
          .select('id, teacher_id')
          .eq('id', room_id)
          .single();
        if (!room || room.teacher_id !== requester.teacher.id) {
          return new Response(JSON.stringify({ error: 'Forbidden: not teacher of this room' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const insertPayload: any = {
        room_id,
        content: String(content).slice(0, 4000),
        sender_type: requester.type,
        sender_name:
          sender_name || (requester.type === 'student' ? requester.student.name : requester.teacher.full_name || requester.teacher.email),
        created_at: new Date().toISOString(),
      };

      if (requester.type === 'student') {
        insertPayload.student_id = requester.student.id;
        insertPayload.teacher_id = requester.student.teacher_id;
      } else {
        insertPayload.teacher_id = requester.teacher.id;
      }

      const { data: row, error } = await supabase
        .from('chat_messages')
        .insert(insertPayload)
        .select('*')
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(row), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT' && action === 'mark_read') {
      if (!roomId) {
        return new Response(JSON.stringify({ error: 'room_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (requester?.type !== 'teacher') {
        return new Response(JSON.stringify({ error: 'Forbidden: teacher only' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const now = new Date().toISOString();
      const payload = { room_id: roomId, teacher_id: requester.teacher.id, last_read_at: now };
      const { error } = await supabase
        .from('chat_reads')
        .upsert(payload, { onConflict: 'room_id,teacher_id' });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, last_read_at: now }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in student-chat function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
