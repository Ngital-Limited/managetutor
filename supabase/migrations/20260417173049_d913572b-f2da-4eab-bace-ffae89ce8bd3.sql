ALTER TABLE public.tutor_profiles
  DROP COLUMN IF EXISTS ai_overview,
  DROP COLUMN IF EXISTS ai_overview_updated_at,
  ADD COLUMN IF NOT EXISTS featured_blurb text;