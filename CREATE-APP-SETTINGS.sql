-- Create app_settings table for per-school configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (school_id, key)
);

CREATE INDEX IF NOT EXISTS idx_app_settings_school_key
  ON public.app_settings (school_id, key);
