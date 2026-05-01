
-- Add new values to application_status enum
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'contact_requested';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'contact_released';

-- Add contact_released_at column
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS contact_released_at TIMESTAMP WITH TIME ZONE;
