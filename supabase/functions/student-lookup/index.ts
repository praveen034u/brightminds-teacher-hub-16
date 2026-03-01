import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { studentPublicId } = await req.json();

    if (!studentPublicId || typeof studentPublicId !== 'string' || studentPublicId.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Student ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedId = studentPublicId.trim().toUpperCase();

    // Look up student by public ID
    const { data: student, error } = await supabase
      .from('students')
      .select('id, name, teacher_id, pin_hash, pin_set_at, pin_reset_required')
      .eq('student_public_id', trimmedId)
      .single();

    if (error || !student) {
      return new Response(JSON.stringify({ error: 'Student ID not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get room name for the student
    const { data: roomStudent } = await supabase
      .from('room_students')
      .select('rooms(name)')
      .eq('student_id', student.id)
      .limit(1)
      .single();

    const roomName = (roomStudent as any)?.rooms?.name || null;

    // Determine pin status
    let pinStatus: 'NOT_SET' | 'SET' | 'RESET_REQUIRED' = 'NOT_SET';
    if (student.pin_reset_required) {
      pinStatus = 'RESET_REQUIRED';
    } else if (student.pin_hash) {
      pinStatus = 'SET';
    }

    return new Response(JSON.stringify({
      studentId: student.id,
      fullName: student.name,
      roomName,
      pinStatus,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in student-lookup:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
