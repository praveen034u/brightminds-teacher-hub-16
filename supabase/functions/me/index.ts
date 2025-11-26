import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface Auth0User {
  auth0_user_id: string;
  auth0_name?: string;
  auth0_email?: string;
  auth0_picture?: string;
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
    let auth0UserId = url.searchParams.get('auth0_user_id');

    if (req.method === 'GET') {
      if (!auth0UserId) {
        return new Response(JSON.stringify({ error: 'auth0_user_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get teacher profile
      const { data: teacher, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('auth0_user_id', auth0UserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return new Response(JSON.stringify(teacher || null), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      // Create or update teacher profile with real Auth0 data
      const body: Auth0User = await req.json();
      auth0UserId = body.auth0_user_id || auth0UserId;

      if (!auth0UserId) {
        return new Response(JSON.stringify({ error: 'auth0_user_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('🔍 Received Auth0 data:', body);

      // Check if teacher already exists
      const { data: existingTeacher, error: selectError } = await supabase
        .from('teachers')
        .select('*')
        .eq('auth0_user_id', auth0UserId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (existingTeacher) {
        // Update existing teacher with real Auth0 data if it was previously hardcoded
        const shouldUpdate = 
          existingTeacher.full_name === 'Mrs. Sharma' || 
          existingTeacher.email === 'sharma@brightminds.edu' ||
          !existingTeacher.full_name ||
          !existingTeacher.email;

        if (shouldUpdate && (body.auth0_name || body.auth0_email)) {
          console.log('🔄 Updating existing teacher with real Auth0 data');
          
          const updateData: any = {};
          if (body.auth0_name && body.auth0_name !== existingTeacher.full_name) {
            updateData.full_name = body.auth0_name;
          }
          if (body.auth0_email && body.auth0_email !== existingTeacher.email) {
            updateData.email = body.auth0_email;
          }

          if (Object.keys(updateData).length > 0) {
            const { data: updatedTeacher, error: updateError } = await supabase
              .from('teachers')
              .update(updateData)
              .eq('auth0_user_id', auth0UserId)
              .select()
              .single();

            if (updateError) throw updateError;

            return new Response(JSON.stringify(updatedTeacher), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Return existing teacher if no update needed
        return new Response(JSON.stringify(existingTeacher), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Create new teacher with real Auth0 data
        console.log('✅ Creating new teacher with Auth0 data');
        
        const teacherData = {
          auth0_user_id: auth0UserId,
          full_name: body.auth0_name || 'Teacher',
          email: body.auth0_email || `teacher-${auth0UserId.slice(-8)}@example.com`,
          school_name: null, // Will be filled by teacher in profile
          grades_taught: [],
          subjects: [],
          preferred_language: 'English',
        };

        const { data: newTeacher, error: insertError } = await supabase
          .from('teachers')
          .insert(teacherData)
          .select()
          .single();

        if (insertError) throw insertError;

        return new Response(JSON.stringify(newTeacher), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (req.method === 'PUT') {
      if (!auth0UserId) {
        return new Response(JSON.stringify({ error: 'auth0_user_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update or create teacher profile
      const body = await req.json();
      
      console.log('🔄 PUT request - updating teacher:', { auth0UserId, body });
      
      // First check if teacher exists
      const { data: existingTeacher } = await supabase
        .from('teachers')
        .select('*')
        .eq('auth0_user_id', auth0UserId)
        .single();

      let teacher, error;

      if (existingTeacher) {
        // Update existing teacher
        const result = await supabase
          .from('teachers')
          .update(body)
          .eq('auth0_user_id', auth0UserId)
          .select()
          .single();
        
        teacher = result.data;
        error = result.error;
      } else {
        // Create new teacher
        const result = await supabase
          .from('teachers')
          .insert({
            auth0_user_id: auth0UserId,
            ...body
          })
          .select()
          .single();
        
        teacher = result.data;
        error = result.error;
      }

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
