import { getSupabaseUrl } from '@/config/supabase';

export type GenieRole = 'student' | 'teacher';

export interface GenieGenerateRequest {
  user_id: string;
  prompt: string;
  role: GenieRole;
  session_id?: string;
}

const getFunctionBaseUrl = () => `${getSupabaseUrl()}/functions/v1/genie-chat`;

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

export const genieChatApi = {
  async generate(payload: GenieGenerateRequest) {
    const response = await fetch(getFunctionBaseUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await parseJsonSafely(response);
    if (!response.ok) {
      const message =
        (data && typeof data.error === 'string' && data.error) ||
        (data && typeof data.message === 'string' && data.message) ||
        `Genie API request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  },

  async sessions(userId: string) {
    const response = await fetch(`${getFunctionBaseUrl()}?user_id=${encodeURIComponent(userId)}`);
    const data = await parseJsonSafely(response);

    if (!response.ok) {
      const message =
        (data && typeof data.error === 'string' && data.error) ||
        (data && typeof data.message === 'string' && data.message) ||
        `Genie sessions request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  },

  async history(userId: string) {
    const response = await fetch(`${getFunctionBaseUrl()}?user_id=${encodeURIComponent(userId)}&view=history`);
    const data = await parseJsonSafely(response);

    if (!response.ok) {
      const message =
        (data && typeof data.error === 'string' && data.error) ||
        (data && typeof data.message === 'string' && data.message) ||
        `Genie history request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  },
};
