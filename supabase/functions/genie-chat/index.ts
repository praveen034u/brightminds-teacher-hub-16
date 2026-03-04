const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const API_BASE_URL = 'https://ai-chat-api-756501801816.us-east4.run.app';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const userId = url.searchParams.get('user_id');
      const view = url.searchParams.get('view') || 'sessions';
      if (!userId) {
        return jsonResponse({ error: 'user_id is required' }, 400);
      }

      const upstreamPath = view === 'history'
        ? `/history/${encodeURIComponent(userId)}`
        : `/sessions/${encodeURIComponent(userId)}`;

      const response = await fetch(`${API_BASE_URL}${upstreamPath}`);
      const data = await parseJsonSafely(response);
      if (!response.ok) {
        return jsonResponse(
          {
            error: `Failed to fetch ${view}`,
            status: response.status,
            details: data,
          },
          502
        );
      }

      return jsonResponse(data ?? (view === 'history' ? { sessions: {} } : { sessions: [] }));
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      const userId = body?.user_id;
      const prompt = body?.prompt;
      const role = body?.role;

      if (!userId || !prompt || (role !== 'student' && role !== 'teacher')) {
        return jsonResponse(
          {
            error: 'Invalid payload. Required fields: user_id, prompt, role(student|teacher)',
          },
          400
        );
      }

      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, prompt, role }),
      });

      const data = await parseJsonSafely(response);
      if (!response.ok) {
        return jsonResponse(
          {
            error: 'Failed to generate response',
            status: response.status,
            details: data,
          },
          502
        );
      }

      return jsonResponse(data ?? { response: '' });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});
