-- Change default status for new jobs to pending_approval
ALTER TABLE public.jobs ALTER COLUMN status SET DEFAULT 'pending_approval'::job_status;

-- Add is_approved to profiles for user approval workflow
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Approve all existing users
UPDATE public.profiles SET is_approved = true WHERE is_approved = false;