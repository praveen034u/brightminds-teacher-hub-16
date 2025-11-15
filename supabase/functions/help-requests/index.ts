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
    const requestId = url.searchParams.get('id');

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
      const { data: helpRequests, error } = await supabase
        .from('help_requests')
        .select(`
          *,
          students (
            id,
            name
          ),
          rooms (
            id,
            name
          )
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(helpRequests || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { data: helpRequest, error } = await supabase
        .from('help_requests')
        .insert({
          ...body,
          teacher_id: teacherId,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(helpRequest), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT') {
      if (!requestId) {
        return new Response(JSON.stringify({ error: 'Request ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const updateData: any = { ...body };
      
      if (body.status === 'resolved' && !body.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data: helpRequest, error } = await supabase
        .from('help_requests')
        .update(updateData)
        .eq('id', requestId)
        .eq('teacher_id', teacherId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(helpRequest), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in help-requests function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
