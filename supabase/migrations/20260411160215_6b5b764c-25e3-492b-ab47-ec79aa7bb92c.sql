-- Drop existing tutor view policy
DROP POLICY IF EXISTS "Tutors can view their demo bookings" ON public.demo_bookings;

-- Tutors can only see approved/confirmed/completed bookings
CREATE POLICY "Tutors can view approved demo bookings"
ON public.demo_bookings
FOR SELECT
TO authenticated
USING (
  (status IN ('approved', 'confirmed', 'completed'))
  AND EXISTS (
    SELECT 1 FROM public.tutor_profiles
    WHERE tutor_profiles.id = demo_bookings.tutor_id
      AND tutor_profiles.user_id = auth.uid()
  )
);

-- Admins can view all demo bookings
CREATE POLICY "Admins can view all demo bookings"
ON public.demo_bookings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update demo bookings (approve/reject)
CREATE POLICY "Admins can update demo bookings"
ON public.demo_bookings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));