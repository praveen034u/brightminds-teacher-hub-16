alter table if exists public.students
  add column if not exists school_id uuid;

create index if not exists students_school_id_idx
  on public.students (school_id);
