
ALTER TABLE public.tutor_profiles
ADD COLUMN IF NOT EXISTS weekly_availability jsonb DEFAULT '{}';

COMMENT ON COLUMN public.tutor_profiles.weekly_availability IS 'JSON object mapping day names to arrays of time slots, e.g. {"Saturday":["morning","afternoon"],"Sunday":["evening"]}';
