-- Replace the overly permissive public SELECT policy on profiles
-- with owner + admin only access to the base table.
-- Public pages should use profiles_public view instead.

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Owner can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Grant SELECT on profiles_public to anon and authenticated so public pages work
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Also ensure tutor_profiles_public is accessible
GRANT SELECT ON public.tutor_profiles_public TO anon, authenticated;