
-- Create demo class bookings table
CREATE TABLE public.demo_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  tutor_id UUID NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id),
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  class_fee INTEGER NOT NULL,
  platform_commission INTEGER NOT NULL DEFAULT 0,
  tutor_payout INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  parent_phone TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_bookings ENABLE ROW LEVEL SECURITY;

-- Parents can create bookings
CREATE POLICY "Parents can create demo bookings"
ON public.demo_bookings FOR INSERT
WITH CHECK (auth.uid() = parent_id);

-- Parents can view their own bookings
CREATE POLICY "Parents can view own demo bookings"
ON public.demo_bookings FOR SELECT
USING (auth.uid() = parent_id);

-- Tutors can view bookings for them
CREATE POLICY "Tutors can view their demo bookings"
ON public.demo_bookings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tutor_profiles
  WHERE tutor_profiles.id = demo_bookings.tutor_id
  AND tutor_profiles.user_id = auth.uid()
));

-- Tutors can update booking status (accept/reject)
CREATE POLICY "Tutors can update demo booking status"
ON public.demo_bookings FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM tutor_profiles
  WHERE tutor_profiles.id = demo_bookings.tutor_id
  AND tutor_profiles.user_id = auth.uid()
));

-- Parents can cancel their own bookings
CREATE POLICY "Parents can update own demo bookings"
ON public.demo_bookings FOR UPDATE
USING (auth.uid() = parent_id);

-- Trigger for updated_at
CREATE TRIGGER update_demo_bookings_updated_at
BEFORE UPDATE ON public.demo_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
