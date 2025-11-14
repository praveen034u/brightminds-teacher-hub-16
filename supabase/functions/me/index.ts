import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    if (req.method === 'GET') {
      // Get teacher profile
      const { data: teacher, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('auth0_user_id', auth0UserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!teacher) {
        // Create mock teacher if doesn't exist
        const { data: newTeacher, error: insertError } = await supabase
          .from('teachers')
          .insert({
            auth0_user_id: auth0UserId,
            full_name: 'Mrs. Sharma',
            email: 'sharma@brightminds.edu',
            school_name: 'Bright Future Elementary',
            grades_taught: ['3', '4', '5'],
            subjects: ['English', 'Math', 'Science'],
            preferred_language: 'English',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return new Response(JSON.stringify(newTeacher), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(teacher), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT') {
      // Update teacher profile
      const body = await req.json();
      
      const { data: teacher, error } = await supabase
        .from('teachers')
        .update(body)
        .eq('auth0_user_id', auth0UserId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(teacher), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in me function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
