import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, History, Plus, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { genieChatApi, type GenieRole } from '@/api/genieChatApi';

interface GenieChatWidgetProps {
  userId: string;
  role: GenieRole;
  title?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'genie';
  text: string;
  timestamp: string;
  isError?: boolean;
}

interface HistorySessionItem {
  sessionId: string;
  preview: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `genie-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const extractGenieText = (payload: any): string => {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload.response === 'string') return payload.response;
  if (typeof payload.answer === 'string') return payload.answer;
  if (typeof payload.message === 'string') return payload.message;
  if (typeof payload.generated_text === 'string') return payload.generated_text;
  if (typeof payload.text === 'string') return payload.text;
  if (payload.data) return extractGenieText(payload.data);
  return '';
};

const normalizeSessionMessages = (payload: any): ChatMessage[] => {
  const now = new Date().toISOString();
  const normalized: ChatMessage[] = [];

  const appendPair = (prompt?: string, response?: string, createdAt?: string, idPrefix?: string) => {
    const ts = createdAt || now;
    if (typeof prompt === 'string' && prompt.trim()) {
      normalized.push({
        id: `${idPrefix || 'session'}-u-${createId()}`,
        sender: 'user',
        text: prompt,
        timestamp: ts,
      });
    }
    if (typeof response === 'string' && response.trim()) {
      normalized.push({
        id: `${idPrefix || 'session'}-g-${createId()}`,
        sender: 'genie',
        text: response,
        timestamp: ts,
      });
    }
  };

  const walk = (node: any, parentId?: string) => {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach((item, idx) => walk(item, `${parentId || 'arr'}-${idx}`));
      return;
    }

    if (typeof node === 'object') {
      const role = typeof node.role === 'string' ? node.role.toLowerCase() : '';
      const text =
        typeof node.content === 'string'
          ? node.content
          : typeof node.message === 'string'
            ? node.message
            : typeof node.text === 'string'
              ? node.text
              : '';
      const createdAt = typeof node.created_at === 'string'
        ? node.created_at
        : typeof node.timestamp === 'string'
          ? node.timestamp
          : now;

      if (role === 'user' || role === 'student' || role === 'teacher') {
        if (text.trim()) {
          normalized.push({
            id: `${parentId || 'msg'}-u-${createId()}`,
            sender: 'user',
            text,
            timestamp: createdAt,
          });
        }
      } else if (role === 'assistant' || role === 'genie' || role === 'bot') {
        if (text.trim()) {
          normalized.push({
            id: `${parentId || 'msg'}-g-${createId()}`,
            sender: 'genie',
            text,
            timestamp: createdAt,
          });
        }
      }

      const prompt = typeof node.prompt === 'string' ? node.prompt : undefined;
      const response = typeof node.response === 'string'
        ? node.response
        : typeof node.answer === 'string'
          ? node.answer
          : undefined;

      if (prompt || response) {
        appendPair(prompt, response, createdAt, parentId);
      }

      if (Array.isArray(node.messages)) walk(node.messages, `${parentId || 'node'}-messages`);
      if (Array.isArray(node.sessions)) walk(node.sessions, `${parentId || 'node'}-sessions`);
      if (Array.isArray(node.conversation)) walk(node.conversation, `${parentId || 'node'}-conversation`);
      if (node.data) walk(node.data, `${parentId || 'node'}-data`);
    }
  };

  walk(payload, 'root');

  normalized.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const deduped: ChatMessage[] = [];
  const seen = new Set<string>();
  for (const item of normalized) {
    const key = `${item.sender}|${item.timestamp}|${item.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
};

const toChatMessage = (entry: any): ChatMessage | null => {
  if (!entry || typeof entry !== 'object') return null;

  const role = typeof entry.role === 'string' ? entry.role.toLowerCase() : '';
  const sender: 'user' | 'genie' = role === 'human' || role === 'user' || role === 'student' || role === 'teacher'
    ? 'user'
    : 'genie';

  const text =
    typeof entry.content === 'string'
      ? entry.content
      : typeof entry.message === 'string'
        ? entry.message
        : typeof entry.text === 'string'
          ? entry.text
          : '';

  if (!text.trim()) return null;

  const timestamp =
    typeof entry.timestamp === 'string'
      ? entry.timestamp
      : typeof entry.created_at === 'string'
        ? entry.created_at
        : new Date().toISOString();

  return {
    id: createId(),
    sender,
    text,
    timestamp,
  };
};

const normalizeHistorySessions = (payload: any): HistorySessionItem[] => {
  const sessionsObject = payload?.sessions;
  if (!sessionsObject || typeof sessionsObject !== 'object') return [];

  const items = Object.entries(sessionsObject).map(([sessionId, entries]) => {
    const messages = Array.isArray(entries)
      ? entries
          .map((entry) => toChatMessage(entry))
          .filter((message): message is ChatMessage => Boolean(message))
      : [];

    const firstUser = messages.find((message) => message.sender === 'user');
    const preview = (firstUser?.text || messages[0]?.text || 'Untitled chat').slice(0, 80);
    const updatedAt = messages[messages.length - 1]?.timestamp || new Date().toISOString();

    return {
      sessionId,
      preview,
      updatedAt,
      messages,
    };
  });

  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const GenieChatWidget = ({ userId, role, title = 'Chat with Genie' }: GenieChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historySessions, setHistorySessions] = useState<HistorySessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyLoadedFor, setHistoryLoadedFor] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);

  const identityKey = useMemo(() => `${role}:${userId}`, [role, userId]);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setHistorySessions([]);
    setActiveSessionId(null);
    setIsNewChat(false);
    setShowHistory(false);
    setIsSending(false);
    setIsLoadingHistory(false);
    setHistoryLoadedFor(null);
    setHistoryError(null);
  }, [identityKey]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [isOpen, messages.length, isLoadingHistory]);

  useEffect(() => {
    if (!isOpen || !userId) return;
    if (historyLoadedFor === identityKey) return;

    const loadSessions = async () => {
      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        const payload = await genieChatApi.history(userId);
        const sessions = normalizeHistorySessions(payload);
        setHistorySessions(sessions);
        if (sessions.length > 0) {
          setActiveSessionId(sessions[0].sessionId);
          setMessages(sessions[0].messages);
          setIsNewChat(false);
        } else {
          setActiveSessionId(null);
          setMessages([]);
          setIsNewChat(true);
        }
      } catch (error) {
        console.warn('Failed to fetch Genie sessions:', error);
        setHistoryError('Could not load previous conversation. You can still start chatting.');
        setMessages([]);
        setIsNewChat(true);
      } finally {
        setIsLoadingHistory(false);
        setHistoryLoadedFor(identityKey);
      }
    };

    loadSessions();
  }, [isOpen, userId, identityKey, historyLoadedFor]);

  const handleSelectHistorySession = (sessionId: string) => {
    const selected = historySessions.find((item) => item.sessionId === sessionId);
    if (!selected) return;
    setActiveSessionId(sessionId);
    setMessages(selected.messages);
    setIsNewChat(false);
    setShowHistory(false);
  };

  const handleStartNewChat = () => {
    if (messages.length > 0) {
      const confirmed = window.confirm('Start a new chat? Your current conversation will be saved.');
      if (!confirmed) return;
    }
    setMessages([]);
    setInput('');
    setIsNewChat(true);
    setActiveSessionId(null);
    setShowHistory(false);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending || !userId) return;

    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: createId(),
      sender: 'user',
      text: trimmed,
      timestamp: now,
    };
    const typingId = createId();
    const typingMessage: ChatMessage = {
      id: typingId,
      sender: 'genie',
      text: 'Genie is typing…',
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMessage, typingMessage]);
    setInput('');
    setIsSending(true);

    try {
      const payload = await genieChatApi.generate({
        user_id: userId,
        prompt: trimmed,
        role,
        ...(activeSessionId && !isNewChat ? { session_id: activeSessionId } : {}),
      });
      const genieText = extractGenieText(payload) || 'I could not generate a response right now.';
      const genieMessage: ChatMessage = {
        id: createId(),
        sender: 'genie',
        text: genieText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => prev.map((msg) => (msg.id === typingId ? genieMessage : msg)));

      const returnedSessionId = typeof payload?.session_id === 'string' ? payload.session_id : null;
      if (returnedSessionId) {
        setActiveSessionId(returnedSessionId);
      }
      setIsNewChat(false);

      try {
        const historyPayload = await genieChatApi.history(userId);
        const sessions = normalizeHistorySessions(historyPayload);
        setHistorySessions(sessions);
      } catch (historyRefreshError) {
        console.warn('Failed to refresh Genie history after send:', historyRefreshError);
      }
    } catch (error) {
      console.error('Genie generate request failed:', error);
      const errorMessage: ChatMessage = {
        id: createId(),
        sender: 'genie',
        text: 'Something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => prev.map((msg) => (msg.id === typingId ? errorMessage : msg)));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[70] w-[calc(100vw-2rem)] max-w-[24rem] sm:w-[24rem]">
          <div className="flex h-[70vh] max-h-[38rem] flex-col overflow-hidden rounded-xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleStartNewChat} className="h-8 px-2 text-xs">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  New Chat
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory((prev) => !prev)}>
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showHistory && (
              <div className="max-h-40 overflow-y-auto border-b bg-white px-3 py-2">
                {historySessions.length === 0 ? (
                  <p className="text-xs text-gray-500">No saved conversations yet.</p>
                ) : (
                  <div className="space-y-1">
                    {historySessions.map((session) => (
                      <button
                        key={session.sessionId}
                        type="button"
                        onClick={() => handleSelectHistorySession(session.sessionId)}
                        className={`w-full rounded-md border px-2 py-1.5 text-left transition ${
                          activeSessionId === session.sessionId
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <p className="truncate text-xs font-medium text-gray-800">{session.preview}</p>
                        <p className="text-[11px] text-gray-500">{formatTime(session.updatedAt)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3">
              {isLoadingHistory && messages.length === 0 && (
                <p className="text-xs text-gray-500">Loading previous conversation…</p>
              )}
              {historyError && messages.length === 0 && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">{historyError}</p>
              )}
              {!isLoadingHistory && messages.length === 0 && (
                <p className="text-xs text-gray-500">{isNewChat ? 'New chat started. Ask Genie anything.' : 'Ask Genie anything about your learning.'}</p>
              )}

              {messages.map((message) => {
                const isUser = message.sender === 'user';
                return (
                  <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                        isUser
                          ? 'bg-blue-600 text-white'
                          : message.isError
                            ? 'border border-red-200 bg-red-50 text-red-700'
                            : 'border bg-white text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      <p className={`mt-1 text-[11px] ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t bg-white p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Type your message..."
                  rows={1}
                  className="min-h-[40px] max-h-28 flex-1 resize-y rounded-md border px-3 py-2 text-sm focus:outline-none"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button onClick={handleSend} disabled={!input.trim() || isSending || !userId} size="sm">
                  <Send className="mr-1 h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-4 right-4 z-[70] h-14 w-14 rounded-full shadow-lg"
        size="icon"
        aria-label="Chat with Genie"
      >
        <Bot className="h-6 w-6" />
      </Button>
    </>
  );
};

export default GenieChatWidget;