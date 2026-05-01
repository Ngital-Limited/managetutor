-- Restore anon SELECT on profiles and tutor_profiles base tables
-- These are needed for FK joins in views and public queries
-- Column-level protection is handled by the public views
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.tutor_profiles TO anon;