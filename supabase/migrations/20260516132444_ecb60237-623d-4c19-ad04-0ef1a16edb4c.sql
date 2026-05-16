
-- Drop duplicate/redundant notification indexes (identical or covered by others)
DROP INDEX IF EXISTS public.idx_notifications_user_id;
DROP INDEX IF EXISTS public.idx_notifications_user_id_is_read;
DROP INDEX IF EXISTS public.idx_notifications_user_id_created_at;

-- Composite index to speed up the fanout query in notify_on_new_job
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_district_available
  ON public.tutor_profiles (district_id, is_available, gender);
