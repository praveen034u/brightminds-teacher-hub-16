import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

type AssessmentResponse = {
  extracted_text: string;
  readability: {
    readability_score: number;
    readable: boolean;
    issues: string[];
    confidence: number;
  };
  assessment: {
    overall_score: number;
    max_score: number;
    rubric_breakdown: Array<{
      criterion: string;
      score: number;
      max: number;
      notes: string;
    }>;
  };
  feedback: {
    strengths: string[];
    improvements: string[];
    next_steps: string[];
    model_answer_suggestion: string;
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const assessmentUrl = Deno.env.get('ASSESSMENT_API_URL');
    const assessmentKey = Deno.env.get('ASSESSMENT_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const token = url.searchParams.get('token') || req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Access token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { assignment_id, inputMode, text } = body as {
      assignment_id?: string;
      inputMode?: 'text' | 'image';
      text?: string;
    };

    if (!assignment_id) {
      return new Response(JSON.stringify({ error: 'assignment_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (inputMode !== 'text' || !text) {
      return new Response(JSON.stringify({ error: 'Only text submissions are supported' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    if (!assessmentUrl) {
      return new Response(JSON.stringify({ error: 'Assessment API not configured' }), {
        status: 501,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const assessmentResponse = await fetch(assessmentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(assessmentKey ? { Authorization: `Bearer ${assessmentKey}` } : {}),
      },
      body: JSON.stringify({ inputMode: 'text', text }),
    });

    if (!assessmentResponse.ok) {
      const errorText = await assessmentResponse.text();
      return new Response(JSON.stringify({ error: 'Assessment API failed', details: errorText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const feedback = (await assessmentResponse.json()) as AssessmentResponse;
    const aiSubmissionId = crypto.randomUUID();

    const { data: attempt, error: attemptError } = await supabase
      .from('assignment_attempts')
      .select('*')
      .eq('assignment_id', assignment_id)
      .eq('student_id', student.id)
      .single();

    if (attemptError) {
      return new Response(JSON.stringify({ error: 'Assignment attempt not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const submissionData = {
      ...(attempt.submission_data || {}),
      ai_submission_id: aiSubmissionId,
    };

    const { error: updateError } = await supabase
      .from('assignment_attempts')
      .update({
        ai_submission_id: aiSubmissionId,
        ai_feedback: feedback,
        ai_feedback_status: 'completed',
        ai_feedback_updated_at: new Date().toISOString(),
        submission_data: submissionData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', attempt.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to save feedback' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        submissionId: aiSubmissionId,
        assignmentId: assignment_id,
        studentId: student.id,
        feedback,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
