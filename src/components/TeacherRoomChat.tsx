import React, { useEffect, useMemo, useRef, useState } from 'react';
import { chatAPI, ChatMessage } from '@/api/chat';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/config/supabase';
import { createClient } from '@supabase/supabase-js';

interface TeacherRoomChatProps {
  auth0UserId: string;
  roomId: string;
  roomName?: string;
  teacherName?: string;
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const TeacherRoomChat: React.FC<TeacherRoomChatProps> = ({ auth0UserId, roomId, roomName, teacherName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const supabaseClient = useMemo(() => {
    const url = getSupabaseUrl();
    const key = getSupabasePublishableKey();
    return createClient(url, key);
  }, []);

  useEffect(() => { supabaseRef.current = supabaseClient; }, [supabaseClient]);

  useEffect(() => {
    const scrollToBottom = () => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; };
    scrollToBottom();
  }, [messages.length]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatAPI.listForTeacher(auth0UserId, roomId, 200);
      setMessages(data);
    } catch (e: any) { setError(e?.message || 'Failed to load messages'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!roomId || !auth0UserId) return;
    loadMessages();
    const client = supabaseRef.current; if (!client) return;
    const channel = client
      .channel(`teacher-room-chat-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        const row = payload?.new as ChatMessage;
        if (row && row.room_id === roomId) setMessages((prev) => [...prev, row]);
      })
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [roomId, auth0UserId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    try {
      const row = await chatAPI.sendForTeacher(auth0UserId, roomId, input.trim(), teacherName);
      setInput('');
      setMessages((prev) => (prev.some(m => m.id === row.id) ? prev : [...prev, row]));
    } catch (e: any) { setError(e?.message || 'Failed to send message'); }
  };

  return (
    <div className="rounded-lg border bg-white">
      <div className="p-4 border-b flex items-center gap-3">
        <h3 className="font-semibold text-gray-900">Class Chat {roomName ? `— ${roomName}` : ''}</h3>
      </div>
      <div className="p-4">
        {error && messages.length === 0 && (<div className="mb-3 text-sm text-red-600">{error}</div>)}
        <div ref={listRef} className="h-64 overflow-y-auto space-y-2 border rounded p-3 bg-gray-50">
          {loading && messages.length === 0 ? (
            <p className="text-sm text-gray-500">Loading messages…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((m) => {
              const isTeacher = m.sender_type === 'teacher';
              return (
                <div key={m.id} className={`flex ${isTeacher ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded px-3 py-2 text-sm shadow ${isTeacher ? 'bg-green-600 text-white' : 'bg-white border'}`}>
                    <div className="font-medium text-xs mb-1 opacity-80">
                      {isTeacher ? (m.sender_name || 'Teacher') : (m.sender_name || 'Student')}
                    </div>
                    <div>{m.content}</div>
                    <div className={`mt-1 text-[11px] ${isTeacher ? 'text-green-100' : 'text-gray-400'}`}>{formatTime(m.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border rounded px-3 py-2 text-sm"
            placeholder="Type your message…"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <button onClick={handleSend} className="px-3 py-2 rounded bg-green-600 text-white text-sm disabled:opacity-50" disabled={!input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherRoomChat;
