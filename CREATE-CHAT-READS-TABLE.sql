-- Track last read timestamp per teacher per room for unread counts
CREATE TABLE IF NOT EXISTS public.chat_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_reads_room_teacher ON public.chat_reads(room_id, teacher_id);
