import { getSupabaseUrl } from '@/config/supabase';

export interface ChatMessage {
  id: string;
  room_id: string;
  teacher_id?: string | null;
  student_id?: string | null;
  sender_type: 'student' | 'teacher';
  sender_name?: string | null;
  content: string;
  created_at: string;
}

const BASE_URL = `${getSupabaseUrl()}/functions/v1/student-chat`;

export const chatAPI = {
  // Student endpoints
  async list(accessToken: string, roomId: string, limit = 100): Promise<ChatMessage[]> {
    const url = `${BASE_URL}?token=${encodeURIComponent(accessToken)}&room_id=${encodeURIComponent(roomId)}&limit=${limit}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to load chat messages (${res.status})`);
    }
    return res.json();
  },

  async send(accessToken: string, roomId: string, content: string, senderName?: string): Promise<ChatMessage> {
    const url = `${BASE_URL}?token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ room_id: roomId, content, sender_name: senderName }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to send message (${res.status}): ${text}`);
    }
    return res.json();
  },

  // Teacher-side APIs using auth0_user_id
  async listForTeacher(auth0UserId: string, roomId: string, limit = 100): Promise<ChatMessage[]> {
    const url = `${BASE_URL}?auth0_user_id=${encodeURIComponent(auth0UserId)}&room_id=${encodeURIComponent(roomId)}&limit=${limit}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to load chat messages (${res.status})`);
    }
    return res.json();
  },

  async sendForTeacher(auth0UserId: string, roomId: string, content: string, senderName?: string): Promise<ChatMessage> {
    const url = `${BASE_URL}?auth0_user_id=${encodeURIComponent(auth0UserId)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, content, sender_name: senderName }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to send message (${res.status}): ${text}`);
    }
    return res.json();
  },

  async getUnreadForTeacher(auth0UserId: string, roomId: string): Promise<{ unread_count: number; last_read_at?: string | null }> {
    const url = `${BASE_URL}?auth0_user_id=${encodeURIComponent(auth0UserId)}&room_id=${encodeURIComponent(roomId)}&action=unread`;
    const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      throw new Error(`Failed to load unread count (${res.status})`);
    }
    return res.json();
  },

  async markReadForTeacher(auth0UserId: string, roomId: string): Promise<{ ok: boolean; last_read_at: string }> {
    const url = `${BASE_URL}?auth0_user_id=${encodeURIComponent(auth0UserId)}&room_id=${encodeURIComponent(roomId)}&action=mark_read`;
    const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      throw new Error(`Failed to mark read (${res.status})`);
    }
    return res.json();
  },
};
