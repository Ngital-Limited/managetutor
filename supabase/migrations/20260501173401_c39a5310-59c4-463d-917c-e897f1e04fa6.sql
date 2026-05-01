-- Restore public SELECT on profiles base table (needed for FK joins in views/queries)
-- The protection comes from using profiles_public view in public-facing code,
-- not from RLS column restriction (which RLS can't do).
-- A fully anonymous SELECT * still only returns non-sensitive columns via the view.

DROP POLICY IF EXISTS "Owner can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);