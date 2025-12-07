import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { teacherEmail, teacherName, enrollmentCode, schoolName, adminName } = await req.json();

    // In production, integrate with your email service (SendGrid, Resend, etc.)
    // For now, we'll just log and return success
    
    const emailContent = `
Dear ${teacherName},

Welcome to BrightMinds! ${adminName} from ${schoolName} has created an account for you.

To complete your setup and start using BrightMinds:

1. Visit: ${Deno.env.get("FRONTEND_URL") || "http://localhost:5173"}/teacher-onboarding
2. Enter your enrollment code: ${enrollmentCode}
3. Create your Auth0 account
4. Complete your profile

Your enrollment code is: ${enrollmentCode}

If you have any questions, please contact your school administrator.

Best regards,
The BrightMinds Team
    `;

    console.log("Would send email to:", teacherEmail);
    console.log("Email content:", emailContent);

    // TODO: Integrate with actual email service
    // Example with Resend:
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "BrightMinds <onboarding@brightminds.com>",
        to: [teacherEmail],
        subject: "Welcome to BrightMinds - Complete Your Setup",
        text: emailContent,
      }),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        // For development: return the code so admin can share it manually
        enrollmentCode 
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
