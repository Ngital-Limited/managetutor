
-- Fix 1: Privilege escalation via user_roles self-insert
DROP POLICY IF EXISTS "Users can insert own role during signup" ON public.user_roles;
CREATE POLICY "Users can insert own non-privileged role during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role IN ('parent'::app_role, 'tutor'::app_role));

-- Fix 2: demo_profiles public exposure -> admins only
DROP POLICY IF EXISTS "Demo profiles are viewable" ON public.demo_profiles;
CREATE POLICY "Admins can view demo profiles"
ON public.demo_profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: notifications open INSERT -> remove (triggers run as SECURITY DEFINER, admins keep their policy)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

-- Fix 4: jobs SELECT must restrict to publicly visible statuses
DROP POLICY IF EXISTS "Open jobs are viewable by everyone" ON public.jobs;
CREATE POLICY "Open jobs are viewable by everyone"
ON public.jobs
FOR SELECT
USING (status IN ('open'::job_status, 'in_progress'::job_status, 'completed'::job_status));

-- Ensure parents/admins can still see their own/all jobs in any status
CREATE POLICY "Parents can view own jobs in any status"
ON public.jobs
FOR SELECT
TO authenticated
USING (auth.uid() = parent_id);

CREATE POLICY "Admins can view all jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tutors who applied should still see the job they applied to
CREATE POLICY "Tutors can view jobs they applied to"
ON public.jobs
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.applications a
  JOIN public.tutor_profiles tp ON tp.id = a.tutor_id
  WHERE a.job_id = jobs.id AND tp.user_id = auth.uid()
));
