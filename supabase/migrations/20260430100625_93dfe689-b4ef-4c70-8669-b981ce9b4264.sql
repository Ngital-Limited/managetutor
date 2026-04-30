-- Indexes to speed up admin tutor profile loading and common filter paths.
-- All use IF NOT EXISTS so re-running is safe.
-- CONCURRENTLY is omitted so they can run inside the migration transaction.

-- tutor_profiles: filters & ordering on the admin tab
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_user_id            ON public.tutor_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_district_id        ON public.tutor_profiles (district_id);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_verification_status ON public.tutor_profiles (verification_status);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_is_available       ON public.tutor_profiles (is_available);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_gender             ON public.tutor_profiles (gender);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_teaching_mode      ON public.tutor_profiles (teaching_mode);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_created_at         ON public.tutor_profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_profiles_slug               ON public.tutor_profiles (slug);

-- tutor_subjects / tutor_education: hydration & subject/education filters
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_tutor_profile_id   ON public.tutor_subjects (tutor_profile_id);
CREATE INDEX IF NOT EXISTS idx_tutor_subjects_subject_id         ON public.tutor_subjects (subject_id);
CREATE INDEX IF NOT EXISTS idx_tutor_education_tutor_id          ON public.tutor_education (tutor_id);

-- profiles: user search + area filter
CREATE INDEX IF NOT EXISTS idx_profiles_area_id                  ON public.profiles (area_id);
CREATE INDEX IF NOT EXISTS idx_profiles_district_id              ON public.profiles (district_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved              ON public.profiles (is_approved);
-- trigram indexes for fast ILIKE search on name / email / phone
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm           ON public.profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm               ON public.profiles USING gin (email     gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_trgm               ON public.profiles USING gin (phone     gin_trgm_ops);

-- jobs: admin job list filters + ordering + reference/title search
CREATE INDEX IF NOT EXISTS idx_jobs_status                       ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_parent_id                    ON public.jobs (parent_id);
CREATE INDEX IF NOT EXISTS idx_jobs_district_id                  ON public.jobs (district_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at                   ON public.jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_job_reference                ON public.jobs (job_reference);
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm                   ON public.jobs USING gin (title gin_trgm_ops);

-- applications: counts + lookups by job and tutor
CREATE INDEX IF NOT EXISTS idx_applications_job_id               ON public.applications (job_id);
CREATE INDEX IF NOT EXISTS idx_applications_tutor_id             ON public.applications (tutor_id);
CREATE INDEX IF NOT EXISTS idx_applications_status               ON public.applications (status);

-- job_subjects link table
CREATE INDEX IF NOT EXISTS idx_job_subjects_job_id               ON public.job_subjects (job_id);
CREATE INDEX IF NOT EXISTS idx_job_subjects_subject_id           ON public.job_subjects (subject_id);

-- areas (filter by parent district)
CREATE INDEX IF NOT EXISTS idx_areas_district_id                 ON public.areas (district_id);

-- notifications (per-user inbox queries)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read     ON public.notifications (user_id, is_read);

-- user_roles (has_role lookup is on every RLS check)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role           ON public.user_roles (user_id, role);

-- Refresh planner stats on the affected hot tables
ANALYZE public.tutor_profiles;
ANALYZE public.tutor_subjects;
ANALYZE public.tutor_education;
ANALYZE public.profiles;
ANALYZE public.jobs;
ANALYZE public.applications;
ANALYZE public.job_subjects;
ANALYZE public.notifications;
ANALYZE public.user_roles;