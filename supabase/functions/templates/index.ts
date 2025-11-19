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

    // Get teacher ID (same pattern as working functions)
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
      try {
        const { data: templates, error } = await supabase
          .from('assignment_templates')
          .select('*')
          .eq('teacher_id', teacherId)
          .eq('template_type', 'custom_room')
          .order('created_at', { ascending: false });

        if (error) {
          console.log('Templates table error (returning empty):', error);
          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify(templates || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.log('Templates query error (returning empty):', err);
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Template creation request:', body);
      
      try {
        const templateData = body.template_data || body;
        
        const insertData = {
          teacher_id: teacherId,
          template_name: templateData.template_name || templateData.name || 'Custom Room Assignment',
          template_type: 'custom_room',
          room_id: templateData.room_id || 'custom',
          room_name: templateData.room_name || 'Custom Room',
          selected_games: templateData.selected_games || [],
          assignment_settings: templateData.assignment_settings || {}
        };

        console.log('Inserting template:', insertData);

        const { data: newTemplate, error } = await supabase
          .from('assignment_templates')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('Template insert error:', error);
          return new Response(JSON.stringify({ 
            error: 'Failed to save template', 
            details: error.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Template created successfully:', newTemplate);
        return new Response(JSON.stringify(newTemplate), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.log('Template save error:', err);
        return new Response(JSON.stringify({ 
          error: 'Failed to save template', 
          details: err.message || 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in templates function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});