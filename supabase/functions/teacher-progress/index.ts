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
    const auth0UserId = url.searchParams.get('auth0_user_id');
    const assignmentId = url.searchParams.get('assignment_id');

    if (!auth0UserId) {
      return new Response(JSON.stringify({ error: 'auth0_user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get teacher ID
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id')
      .eq('auth0_user_id', auth0UserId)
      .single();

    if (teacherError) {
      console.error('Teacher lookup error:', teacherError);
      return new Response(JSON.stringify({ error: 'Teacher not found', details: teacherError.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const teacherId = teacher.id;

    if (req.method === 'GET') {
      if (assignmentId) {
        // Get progress for specific assignment
        const { data: assignment, error: assignmentError } = await supabase
          .from('assignments')
          .select('*')
          .eq('id', assignmentId)
          .eq('teacher_id', teacherId)
          .single();

        if (assignmentError) {
          console.error('Assignment lookup error:', assignmentError);
          return new Response(JSON.stringify({ error: 'Assignment not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get all students for this teacher
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id, name, email')
          .eq('teacher_id', teacherId);

        if (studentsError) {
          console.error('Students lookup error:', studentsError);
          return new Response(JSON.stringify({ error: 'Failed to get students' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get attempts for this assignment
        const { data: attempts, error: attemptsError } = await supabase
          .from('assignment_attempts')
          .select('student_id, status, score, created_at, completed_at')
          .eq('assignment_id', assignmentId);

        if (attemptsError) {
          console.error('Attempts lookup error:', attemptsError);
          return new Response(JSON.stringify({ error: 'Failed to get attempts' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Build progress data
        const progress = students.map(student => {
          const attempt = attempts.find(a => a.student_id === student.id);
          return {
            student_id: student.id,
            student_name: student.name,
            student_email: student.email,
            status: attempt?.status || 'not_started',
            score: attempt?.score || null,
            started_at: attempt?.created_at || null,
            completed_at: attempt?.completed_at || null
          };
        });

        return new Response(JSON.stringify({
          assignment,
          progress,
          summary: {
            total_students: students.length,
            completed: attempts.filter(a => a.status === 'completed').length,
            in_progress: attempts.filter(a => a.status === 'in_progress').length,
            not_started: students.length - attempts.length,
            average_score: attempts.length > 0 
              ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length 
              : 0
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Get overall progress for all assignments
        const { data: assignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select(`
            id,
            title,
            created_at,
            due_date,
            status
          `)
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false });

        if (assignmentsError) {
          console.error('Assignments lookup error:', assignmentsError);
          return new Response(JSON.stringify({ error: 'Failed to get assignments' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get total student count
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('teacher_id', teacherId);

        if (studentsError) {
          console.error('Students count error:', studentsError);
          return new Response(JSON.stringify({ error: 'Failed to get student count' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const totalStudents = students.length;

        // Get progress for each assignment
        const progressData = await Promise.all(
          assignments.map(async (assignment) => {
            const { data: attempts } = await supabase
              .from('assignment_attempts')
              .select('status, score')
              .eq('assignment_id', assignment.id);

            return {
              ...assignment,
              total_students: totalStudents,
              completed: attempts?.filter(a => a.status === 'completed').length || 0,
              in_progress: attempts?.filter(a => a.status === 'in_progress').length || 0,
              not_started: totalStudents - (attempts?.length || 0),
              average_score: attempts && attempts.length > 0
                ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length
                : 0
            };
          })
        );

        return new Response(JSON.stringify(progressData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in teacher-progress function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});