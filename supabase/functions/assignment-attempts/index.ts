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
    const assignmentId = url.searchParams.get('assignment_id');
    const action = url.searchParams.get('action');

    if (!token) {
      return new Response(JSON.stringify({ code: 401, message: 'Missing authorization header' }), {
        status: 401,
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

    if (req.method === 'GET' && assignmentId) {
      // Get specific assignment attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('assignment_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', student.id)
        .single();

      if (attemptError && attemptError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw attemptError;
      }

      return new Response(JSON.stringify(attempt || null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST' && action === 'start' && assignmentId) {
      // Start an assignment attempt
      const { data: existingAttempt, error: checkError } = await supabase
        .from('assignment_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', student.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      let result;
      if (existingAttempt) {
        // Update existing attempt
        if (existingAttempt.status === 'completed' || existingAttempt.status === 'submitted') {
          // Allow retrying completed assignments
          const { data: updatedAttempt, error: updateError } = await supabase
            .from('assignment_attempts')
            .update({
              status: 'in_progress',
              attempts_count: (existingAttempt.attempts_count || 0) + 1,
              started_at: new Date().toISOString(),
              completed_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAttempt.id)
            .select()
            .single();

          if (updateError) throw updateError;
          result = updatedAttempt;
        } else if (existingAttempt.status === 'in_progress') {
          // Already in progress
          result = existingAttempt;
        } else {
          // Update from not_started to in_progress
          const { data: updatedAttempt, error: updateError } = await supabase
            .from('assignment_attempts')
            .update({
              status: 'in_progress',
              attempts_count: 1,
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAttempt.id)
            .select()
            .single();

          if (updateError) throw updateError;
          result = updatedAttempt;
        }
      } else {
        // Create new attempt
        const { data: newAttempt, error: createError } = await supabase
          .from('assignment_attempts')
          .insert([{
            assignment_id: assignmentId,
            student_id: student.id,
            status: 'in_progress',
            attempts_count: 1,
            started_at: new Date().toISOString(),
            realtime_synced: true
          }])
          .select(`
            *,
            assignments!inner(
              id,
              title,
              teacher_id
            ),
            students!inner(
              id,
              name
            )
          `)
          .single();

        if (createError) throw createError;
        result = newAttempt;
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST' && action === 'complete' && assignmentId) {
      // Complete/submit an assignment attempt
      const body = await req.json();
      const { score, submissionData, feedback } = body;

      const { data: existingAttempt, error: checkError } = await supabase
        .from('assignment_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', student.id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return new Response(JSON.stringify({ error: 'No attempt found. Please start the assignment first.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw checkError;
      }

      // Calculate max score
      const currentMaxScore = existingAttempt.max_score || 0;
      const newMaxScore = Math.max(currentMaxScore, score || 0);

      const { data: updatedAttempt, error: updateError } = await supabase
        .from('assignment_attempts')
        .update({
          status: 'completed',
          score: score,
          max_score: newMaxScore,
          completed_at: new Date().toISOString(),
          submission_data: submissionData,
          feedback: feedback,
          updated_at: new Date().toISOString(),
          realtime_synced: true
        })
        .eq('id', existingAttempt.id)
        .select(`
          *,
          assignments!inner(
            id,
            title,
            teacher_id,
            teachers!inner(
              id,
              auth0_user_id,
              full_name
            )
          ),
          students!inner(
            id,
            name,
            email
          )
        `)
        .single();

      if (updateError) {
        console.error('Update error details:', updateError);
        throw updateError;
      }

      // Log successful completion for debugging
      console.log('✅ Assignment completed successfully:', {
        id: updatedAttempt.id,
        assignment_id: updatedAttempt.assignment_id,
        student_id: updatedAttempt.student_id,
        student_name: updatedAttempt.students?.name,
        score: updatedAttempt.score,
        completed_at: updatedAttempt.completed_at
      });

      // Send a broadcast notification to teachers for immediate updates
      try {
        const broadcastChannel = supabase.channel('assignment-completion-alerts');
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'assignment-completed',
          payload: {
            assignmentId: updatedAttempt.assignment_id,
            studentId: updatedAttempt.student_id,
            studentName: updatedAttempt.students?.name || 'Unknown Student',
            score: updatedAttempt.score,
            completedAt: updatedAttempt.completed_at,
            teacherId: updatedAttempt.assignments?.teacher_id
          }
        });
        console.log('📡 Broadcast sent for assignment completion');
      } catch (broadcastError) {
        console.warn('Failed to send completion broadcast:', broadcastError);
        // Don't fail the main operation if broadcast fails
      }

      return new Response(JSON.stringify(updatedAttempt), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET' && !assignmentId) {
      // Get all attempts for this student
      const { data: attempts, error: attemptsError } = await supabase
        .from('assignment_attempts')
        .select(`
          *,
          assignments (
            id,
            title,
            description,
            due_date,
            assignment_type,
            games (
              id,
              name,
              game_type
            )
          )
        `)
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      return new Response(JSON.stringify(attempts || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in assignment-attempts function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});