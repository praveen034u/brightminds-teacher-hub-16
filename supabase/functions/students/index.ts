import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'x-total-count, x-page, x-page-size',
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
    const studentId = url.searchParams.get('id');
    const action = url.searchParams.get('action');
    const gradeFilter = url.searchParams.get('grade');
    const search = url.searchParams.get('search');
    const includeMeta = url.searchParams.get('includeMeta') === 'true';
    const pageParam = url.searchParams.get('page');
    const pageSizeParam = url.searchParams.get('pageSize');
    const page = pageParam ? Math.max(1, Number.parseInt(pageParam, 10) || 1) : null;
    const pageSize = pageSizeParam ? Math.max(1, Number.parseInt(pageSizeParam, 10) || 10) : null;

    // Get teacher ID from auth0_user_id
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, grades_taught')
      .eq('auth0_user_id', auth0UserId)
      .single();

    if (!teacher) {
      return new Response(JSON.stringify({ error: 'Teacher not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const teacherId = teacher.id;
    const gradesTaught = Array.isArray(teacher.grades_taught)
      ? teacher.grades_taught.filter((grade) => typeof grade === 'string' && grade.trim())
      : [];

    if (req.method === 'GET') {
      let query = supabase
        .from('students')
        .select('*', { count: includeMeta || page !== null || pageSize !== null ? 'exact' : undefined })
        .order('name');

      if (gradesTaught.length > 0) {
        query = query.in('grade', gradesTaught);
      } else {
        query = query.eq('teacher_id', teacherId);
      }

      if (gradeFilter) {
        const grades = gradeFilter
          .split(',')
          .map((grade) => grade.trim())
          .filter(Boolean);
        if (grades.length === 1) {
          query = query.eq('grade', grades[0]);
        } else if (grades.length > 1) {
          query = query.in('grade', grades);
        }
      }

      if (search) {
        const escaped = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
        query = query.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
      }

      if (page !== null && pageSize !== null) {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;
        query = query.range(start, end);
      }

      const { data: students, error, count } = await query;

      if (error) throw error;

      // Generate access URLs for each student
      const studentsWithUrls = students?.map(student => ({
        ...student,
        access_url: student.access_token 
          ? `${req.headers.get('origin') || 'http://localhost:8081'}/student-portal?token=${student.access_token}`
          : null
      })) || [];

      const totalCount = count ?? studentsWithUrls.length;
      const responseBody = includeMeta || page !== null || pageSize !== null
        ? {
            data: studentsWithUrls,
            total: totalCount,
            page: page ?? 1,
            pageSize: pageSize ?? totalCount,
          }
        : studentsWithUrls;

      return new Response(JSON.stringify(responseBody), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-total-count': totalCount.toString(),
          'x-page': (page ?? 1).toString(),
          'x-page-size': (pageSize ?? totalCount).toString(),
        },
      });
    }

    if (req.method === 'POST') {
      if (action === 'bulk-csv') {
        // Handle CSV bulk upload
        const body = await req.json();
        const { students: csvStudents } = body;

        const studentsToInsert = csvStudents.map((s: any) => ({
          ...s,
          teacher_id: teacherId,
        }));

        const { data, error } = await supabase
          .from('students')
          .insert(studentsToInsert)
          .select();

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            created: data?.length || 0,
            students: data,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Create single student
      const body = await req.json();
      const { data: student, error } = await supabase
        .from('students')
        .insert({
          ...body,
          teacher_id: teacherId,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(student), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT') {
      if (!studentId) {
        return new Response(JSON.stringify({ error: 'Student ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { data: student, error } = await supabase
        .from('students')
        .update(body)
        .eq('id', studentId)
        .eq('teacher_id', teacherId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(student), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      if (!studentId) {
        return new Response(JSON.stringify({ error: 'Student ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)
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
    console.error('Error in students function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
