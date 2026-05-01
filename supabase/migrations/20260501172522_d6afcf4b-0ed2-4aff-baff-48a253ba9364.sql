-- 1. Create public view for tutor_profiles (excludes sensitive personal data)
CREATE OR REPLACE VIEW public.tutor_profiles_public AS
SELECT 
  id, user_id, bio, education, experience_years,
  monthly_salary_min, monthly_salary_max, teaching_mode, gender,
  is_available, verification_status, verified_at, total_students,
  created_at, updated_at, is_featured, display_name, district_id,
  class_levels, video_url, teaching_philosophy, success_stories,
  is_student, verification_paid, slug, area_id, featured_blurb
FROM public.tutor_profiles;

-- 2. Create public view for profiles (excludes phone and ban details)
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id, full_name, email, avatar_url, district_id, area_id,
  preferred_language, created_at, updated_at, user_reference,
  is_approved, is_banned, email_verified, phone_verified, referral_source
FROM public.profiles;

-- 3. Grant SELECT on views
GRANT SELECT ON public.tutor_profiles_public TO anon, authenticated;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 4. Tighten tutor_profiles base table SELECT
DROP POLICY IF EXISTS "Approved tutor profiles are viewable" ON public.tutor_profiles;

CREATE POLICY "Tutors can view own full profile"
ON public.tutor_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tutor profiles"
ON public.tutor_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));