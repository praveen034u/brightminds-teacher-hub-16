alter table if exists public.assignment_attempts
  add column if not exists ai_submission_id uuid,
  add column if not exists ai_feedback jsonb,
  add column if not exists ai_feedback_status text default 'pending',
  add column if not exists ai_feedback_error text,
  add column if not exists ai_feedback_updated_at timestamptz;

create index if not exists assignment_attempts_ai_submission_id_idx
  on public.assignment_attempts (ai_submission_id);
