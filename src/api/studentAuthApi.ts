import { getSupabaseUrl, getSupabasePublishableKey } from '@/config/supabase';

const SUPABASE_URL = getSupabaseUrl();
const API_KEY = getSupabasePublishableKey();

async function callStudentEdge(
  functionName: string,
  options: {
    method?: 'GET' | 'POST';
    body?: any;
    sessionToken?: string;
  } = {}
) {
  const { method = 'POST', body, sessionToken } = options;

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': API_KEY,
  };

  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  const config: RequestInit = { method, headers };

  if (body && method === 'POST') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const err = JSON.parse(errorText);
      throw new Error(err.error || `Request failed with status ${response.status}`);
    } catch (e) {
      if (e instanceof Error && e.message !== `Request failed with status ${response.status}`) throw e;
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }
  }

  return response.json();
}

export const studentAuthAPI = {
  lookup: (studentPublicId: string) =>
    callStudentEdge('student-lookup', { body: { studentPublicId } }),

  setPin: (studentPublicId: string, pin: string) =>
    callStudentEdge('student-set-pin', { body: { studentPublicId, pin } }),

  loginPin: (studentPublicId: string, pin: string) =>
    callStudentEdge('student-login-pin', { body: { studentPublicId, pin } }),

  getSession: (sessionToken: string) =>
    callStudentEdge('student-session', { method: 'GET', sessionToken }),
};

// Session management helpers
const SESSION_KEY = 'bm_student_session';
const SESSION_EXPIRES_KEY = 'bm_student_session_expires';
const STUDENT_PUBLIC_ID_KEY = 'bm_student_public_id';

export function saveStudentSession(token: string, expiresAt: string, publicId: string) {
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(SESSION_EXPIRES_KEY, expiresAt);
  localStorage.setItem(STUDENT_PUBLIC_ID_KEY, publicId);
}

export function getStudentSession(): string | null {
  const token = localStorage.getItem(SESSION_KEY);
  const expires = localStorage.getItem(SESSION_EXPIRES_KEY);
  if (!token || !expires) return null;
  if (new Date(expires) < new Date()) {
    clearStudentSession();
    return null;
  }
  return token;
}

export function getStudentPublicId(): string | null {
  return localStorage.getItem(STUDENT_PUBLIC_ID_KEY);
}

export function clearStudentSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_EXPIRES_KEY);
  localStorage.removeItem(STUDENT_PUBLIC_ID_KEY);
}
