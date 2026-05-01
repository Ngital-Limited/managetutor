-- Revoke anon direct access to profiles base table
-- Anon users must go through profiles_public view
REVOKE SELECT ON public.profiles FROM anon;

-- Ensure anon can still use the public views
GRANT SELECT ON public.profiles_public TO anon;
GRANT SELECT ON public.tutor_profiles_public TO anon;

-- Also revoke anon direct access to tutor_profiles base table
REVOKE SELECT ON public.tutor_profiles FROM anon;