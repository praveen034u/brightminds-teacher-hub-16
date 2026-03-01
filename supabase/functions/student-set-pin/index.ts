import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { encode as hexEncode } from 'https://deno.land/std@0.224.0/encoding/hex.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Simple hash function using Web Crypto API (PBKDF2 with salt)
async function hashPin(pin: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  const pinSalt = salt || crypto.randomUUID();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(pinSalt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(derivedBits);
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash: hashHex, salt: pinSalt };
}

async function generateSessionToken(): Promise<{ token: string; hash: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  // Hash the token for storage
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  const hashArray = new Uint8Array(hashBuffer);
  const hash = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  return { token, hash };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { studentPublicId, pin } = await req.json();

    // Validate input
    if (!studentPublicId || !pin) {
      return new Response(JSON.stringify({ error: 'Student ID and PIN are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!/^\d{6}$/.test(pin)) {
      return new Response(JSON.stringify({ error: 'PIN must be exactly 6 digits' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedId = studentPublicId.trim().toUpperCase();

    // Look up student
    const { data: student, error: lookupError } = await supabase
      .from('students')
      .select('id, pin_hash, pin_reset_required')
      .eq('student_public_id', trimmedId)
      .single();

    if (lookupError || !student) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only allow set-pin if PIN not set OR reset required
    if (student.pin_hash && !student.pin_reset_required) {
      return new Response(JSON.stringify({ error: 'PIN already set. Use login instead.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash the PIN
    const { hash: pinHash, salt: pinSalt } = await hashPin(pin);

    // Update student record
    const { error: updateError } = await supabase
      .from('students')
      .update({
        pin_hash: `${pinSalt}:${pinHash}`,
        pin_set_at: new Date().toISOString(),
        pin_reset_required: false,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', student.id);

    if (updateError) throw updateError;

    // Create session
    const { token, hash: tokenHash } = await generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: sessionError } = await supabase
      .from('student_sessions')
      .insert({
        student_id: student.id,
        session_token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) throw sessionError;

    return new Response(JSON.stringify({
      sessionToken: token,
      expiresAt: expiresAt.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in student-set-pin:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
