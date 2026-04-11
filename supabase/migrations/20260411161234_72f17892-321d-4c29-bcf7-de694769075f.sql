ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS number_of_students integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS student_age text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS location_details text;