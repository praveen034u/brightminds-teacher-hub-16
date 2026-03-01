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

    // Verify teacher auth via Auth0 user ID passed as query param
    const url = new URL(req.url);
    const auth0UserId = url.searchParams.get('auth0_user_id');

    if (!auth0UserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get teacher
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id, grades_taught')
      .eq('auth0_user_id', auth0UserId)
      .single();

    if (teacherError || !teacher) {
      return new Response(JSON.stringify({ error: 'Teacher not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { studentId } = await req.json();

    if (!studentId) {
      return new Response(JSON.stringify({ error: 'Student ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify student belongs to this teacher (by teacher_id or grades_taught)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, teacher_id, grade')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check ownership: teacher_id match or grade in grades_taught
    const gradesTaught = Array.isArray(teacher.grades_taught) ? teacher.grades_taught : [];
    const isOwner = student.teacher_id === teacher.id || 
                    (student.grade && gradesTaught.includes(student.grade));

    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'You can only reset PINs for your own students' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reset PIN
    const { error: updateError } = await supabase
      .from('students')
      .update({
        pin_hash: null,
        pin_set_at: null,
        pin_reset_required: true,
      })
      .eq('id', studentId);

    if (updateError) throw updateError;

    // Invalidate all sessions for this student
    await supabase
      .from('student_sessions')
      .delete()
      .eq('student_id', studentId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in student-reset-pin:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
