-- Extend application_status enum
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'shortlisted';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'invited_to_demo';

-- Link demo_bookings back to the application that triggered the invite
ALTER TABLE public.demo_bookings
  ADD COLUMN IF NOT EXISTS application_id uuid;

CREATE INDEX IF NOT EXISTS idx_demo_bookings_application_id
  ON public.demo_bookings(application_id);