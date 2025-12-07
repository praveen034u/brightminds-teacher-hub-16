import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user is an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("teachers")
      .select("role, school_id")
      .eq("auth0_user_id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const endpoint = pathParts[pathParts.length - 1];

    // GET /admin-teachers - List all teachers in the same school
    if (req.method === "GET" && endpoint === "admin-teachers") {
      let query = supabaseClient
        .from("teachers")
        .select("id, auth0_user_id, full_name, email, school_name, school_id, is_active, role, created_at, grades_taught, subjects")
        .eq("role", "teacher")
        .order("created_at", { ascending: false });

      if (profile.school_id) {
        query = query.eq("school_id", profile.school_id);
      }

      const { data: teachers, error: teachersError } = await query;

      if (teachersError) {
        throw teachersError;
      }

      return new Response(JSON.stringify(teachers), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /admin-teachers/:id/activate - Activate a teacher
    if (req.method === "POST" && endpoint === "activate") {
      const teacherId = pathParts[pathParts.length - 2];

      const { error: updateError } = await supabaseClient
        .from("teachers")
        .update({ is_active: true })
        .eq("id", teacherId)
        .eq("school_id", profile.school_id); // Ensure same school

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true, message: "Teacher activated" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST /admin-teachers/:id/deactivate - Deactivate a teacher
    if (req.method === "POST" && endpoint === "deactivate") {
      const teacherId = pathParts[pathParts.length - 2];

      const { error: updateError } = await supabaseClient
        .from("teachers")
        .update({ is_active: false })
        .eq("id", teacherId)
        .eq("school_id", profile.school_id); // Ensure same school

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true, message: "Teacher deactivated" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Endpoint not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
