
-- Security definer function to check if current user has applied to a job
CREATE OR REPLACE FUNCTION public.tutor_has_applied_to_job(_job_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM applications a
    JOIN tutor_profiles tp ON tp.id = a.tutor_id
    WHERE a.job_id = _job_id
      AND tp.user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Tutors can view jobs they applied to" ON public.jobs;

CREATE POLICY "Tutors can view jobs they applied to"
ON public.jobs
FOR SELECT
TO authenticated
USING (public.tutor_has_applied_to_job(id, auth.uid()));
