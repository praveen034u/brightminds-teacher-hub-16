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
      .from("profiles")
      .select("role, school_id, id")
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

    const { teacherId, email } = await req.json();

    if (!teacherId || !email) {
      return new Response(
        JSON.stringify({ error: "teacherId and email are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the teacher belongs to the same school
    const { data: teacher, error: teacherError } = await supabaseClient
      .from("profiles")
      .select("id, email, school_id")
      .eq("id", teacherId)
      .eq("role", "teacher")
      .single();

    if (teacherError || !teacher) {
      return new Response(
        JSON.stringify({ error: "Teacher not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (profile.school_id && teacher.school_id !== profile.school_id) {
      return new Response(
        JSON.stringify({ error: "Cannot reset password for teacher from different school" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // TODO: Integrate with Auth0 Management API or Supabase Auth to send password reset email
    // For now, return a placeholder response
    
    // Option 1: Using Supabase Auth (if you're using Supabase Auth instead of Auth0)
    // const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email, {
    //   redirectTo: `${Deno.env.get("APP_URL")}/reset-password`,
    // });
    
    // Option 2: Using Auth0 Management API
    // You would need to:
    // 1. Get Auth0 Management API token
    // 2. Call the Auth0 password reset endpoint
    // Example:
    // const auth0Domain = Deno.env.get("AUTH0_DOMAIN");
    // const auth0ClientId = Deno.env.get("AUTH0_CLIENT_ID");
    // const auth0ClientSecret = Deno.env.get("AUTH0_CLIENT_SECRET");
    //
    // Get Management API token:
    // const tokenResponse = await fetch(`https://${auth0Domain}/oauth/token`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     client_id: auth0ClientId,
    //     client_secret: auth0ClientSecret,
    //     audience: `https://${auth0Domain}/api/v2/`,
    //     grant_type: 'client_credentials'
    //   })
    // });
    // const { access_token } = await tokenResponse.json();
    //
    // Send password reset email:
    // const resetResponse = await fetch(`https://${auth0Domain}/api/v2/tickets/password-change`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${access_token}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     email: email,
    //     connection_id: 'Username-Password-Authentication' // or your connection name
    //   })
    // });

    console.log(`Password reset requested for teacher: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password reset email sent successfully",
        note: "This is a placeholder. Please integrate with Auth0 Management API or Supabase Auth to actually send the email.",
      }),
      {
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
