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
    const token = url.searchParams.get('token') || req.headers.get('authorization')?.replace('Bearer ', '');
    const submissionId = url.searchParams.get('submission_id');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Access token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!submissionId) {
      return new Response(JSON.stringify({ error: 'submission_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('access_token', token)
      .single();

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Invalid access token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: attempt, error: attemptError } = await supabase
      .from('assignment_attempts')
      .select('*')
      .eq('student_id', student.id)
      .eq('ai_submission_id', submissionId)
      .single();

    if (attemptError || !attempt) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!attempt.ai_feedback) {
      return new Response(JSON.stringify({ error: 'Feedback not ready' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = {
      id: attempt.ai_submission_id,
      assignmentId: attempt.assignment_id,
      studentId: attempt.student_id,
      submittedAt: attempt.ai_feedback_updated_at || attempt.submitted_at || attempt.completed_at || new Date().toISOString(),
      inputMode: 'text',
      text: attempt.submission_data?.submission_text || attempt.submission_data?.text || undefined,
      feedback: attempt.ai_feedback,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in submission-feedback function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
