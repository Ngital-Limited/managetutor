-- Drop the trigger function that updates tutor ratings
DROP FUNCTION IF EXISTS public.update_tutor_rating() CASCADE;

-- Drop review-related tables (CASCADE removes dependent policies/triggers)
DROP TABLE IF EXISTS public.review_update_requests CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;

-- Remove rating-related columns from tutor_profiles
ALTER TABLE public.tutor_profiles
  DROP COLUMN IF EXISTS average_rating,
  DROP COLUMN IF EXISTS total_reviews;

-- Remove the can_manage_reviews permission column from admin_permissions
ALTER TABLE public.admin_permissions
  DROP COLUMN IF EXISTS can_manage_reviews;