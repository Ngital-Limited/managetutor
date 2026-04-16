-- Rename hourly rate columns to monthly salary
ALTER TABLE public.tutor_profiles RENAME COLUMN hourly_rate_min TO monthly_salary_min;
ALTER TABLE public.tutor_profiles RENAME COLUMN hourly_rate_max TO monthly_salary_max;

-- Add is_student field for document requirement distinction
ALTER TABLE public.tutor_profiles ADD COLUMN is_student boolean NOT NULL DEFAULT false;