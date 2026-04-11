
-- Add personal detail columns to tutor_profiles
ALTER TABLE public.tutor_profiles
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Bangladeshi',
  ADD COLUMN IF NOT EXISTS national_id_no text,
  ADD COLUMN IF NOT EXISTS religion text,
  ADD COLUMN IF NOT EXISTS height text,
  ADD COLUMN IF NOT EXISTS weight text;

-- Create tutor_education table
CREATE TABLE public.tutor_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  institution text NOT NULL,
  degree text NOT NULL,
  field_of_study text,
  passing_year integer,
  result text,
  is_current boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutor_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Education records are viewable by everyone"
  ON public.tutor_education FOR SELECT USING (true);

CREATE POLICY "Tutors can insert own education"
  ON public.tutor_education FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tutor_profiles
    WHERE tutor_profiles.id = tutor_education.tutor_id
      AND tutor_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Tutors can update own education"
  ON public.tutor_education FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tutor_profiles
    WHERE tutor_profiles.id = tutor_education.tutor_id
      AND tutor_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Tutors can delete own education"
  ON public.tutor_education FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tutor_profiles
    WHERE tutor_profiles.id = tutor_education.tutor_id
      AND tutor_profiles.user_id = auth.uid()
  ));

-- Create tutor_job_experiences table
CREATE TABLE public.tutor_job_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  company text NOT NULL,
  designation text NOT NULL,
  start_date date,
  end_date date,
  is_current boolean DEFAULT false,
  responsibilities text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutor_job_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job experiences are viewable by everyone"
  ON public.tutor_job_experiences FOR SELECT USING (true);

CREATE POLICY "Tutors can insert own experiences"
  ON public.tutor_job_experiences FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tutor_profiles
    WHERE tutor_profiles.id = tutor_job_experiences.tutor_id
      AND tutor_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Tutors can update own experiences"
  ON public.tutor_job_experiences FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tutor_profiles
    WHERE tutor_profiles.id = tutor_job_experiences.tutor_id
      AND tutor_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Tutors can delete own experiences"
  ON public.tutor_job_experiences FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tutor_profiles
    WHERE tutor_profiles.id = tutor_job_experiences.tutor_id
      AND tutor_profiles.user_id = auth.uid()
  ));
