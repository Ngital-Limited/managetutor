
-- 1) Restrict profiles SELECT
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Recreate profiles_public without email (and other PII)
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT
  id,
  full_name,
  avatar_url,
  district_id,
  area_id,
  preferred_language,
  created_at,
  updated_at,
  user_reference,
  is_approved,
  is_banned,
  email_verified,
  phone_verified,
  referral_source
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 3) Harden messages SELECT to require an authenticated user
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (auth.uid() = sender_id OR auth.uid() = receiver_id)
);
