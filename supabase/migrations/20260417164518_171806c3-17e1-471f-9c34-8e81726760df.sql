ALTER TABLE public.tutor_profiles ADD COLUMN area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_area_id ON public.tutor_profiles(area_id);