-- Add enrollment/onboarding fields to teachers table
-- These fields allow admin to create teacher accounts that teachers can claim later

ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS enrollment_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'completed')),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ;

-- Create indexes for enrollment lookups
CREATE INDEX IF NOT EXISTS idx_teachers_enrollment_code ON public.teachers(enrollment_code);
CREATE INDEX IF NOT EXISTS idx_teachers_access_token ON public.teachers(access_token);
CREATE INDEX IF NOT EXISTS idx_teachers_invitation_status ON public.teachers(invitation_status);

-- Add comments
COMMENT ON COLUMN public.teachers.enrollment_code IS 'Unique code for teacher to claim their account';
COMMENT ON COLUMN public.teachers.access_token IS 'Secure token for initial access';
COMMENT ON COLUMN public.teachers.invitation_status IS 'Status of teacher invitation: pending or completed';
COMMENT ON COLUMN public.teachers.invited_at IS 'When the teacher was invited by admin';
COMMENT ON COLUMN public.teachers.enrolled_at IS 'When the teacher completed their enrollment';
