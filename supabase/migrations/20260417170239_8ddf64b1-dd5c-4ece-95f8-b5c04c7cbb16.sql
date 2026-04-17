ALTER TABLE public.tutor_profiles ADD COLUMN IF NOT EXISTS area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_area_id ON public.tutor_profiles(area_id);

-- Backfill area_id from profiles.area_id where tutor_profiles.area_id is null
UPDATE public.tutor_profiles tp
SET area_id = p.area_id
FROM public.profiles p
WHERE tp.user_id = p.id AND tp.area_id IS NULL AND p.area_id IS NOT NULL;