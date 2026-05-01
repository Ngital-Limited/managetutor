-- Add new values to verification_status enum
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'document_needed';

-- Add verification_notes column for admin notes during review
ALTER TABLE public.tutor_profiles ADD COLUMN IF NOT EXISTS verification_notes text;