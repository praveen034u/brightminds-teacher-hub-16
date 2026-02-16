-- Chat messages table for student portal real-time chat
-- Run this in Supabase SQL editor to create the table and indexes

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('student','teacher')),
  sender_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created_at ON public.chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_teacher_id ON public.chat_messages(teacher_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_student_id ON public.chat_messages(student_id);

-- Optional: enable Realtime publication (if not already enabled globally)
-- Note: Supabase CLI typically enables Realtime on all tables by default.
-- If needed, uncomment the following line in your environment:
-- ALTER publication supabase_realtime ADD TABLE public.chat_messages;

-- Row Level Security: Chat is accessed through Edge Functions with service role.
-- If direct client reads/writes are needed later, add appropriate RLS policies.
