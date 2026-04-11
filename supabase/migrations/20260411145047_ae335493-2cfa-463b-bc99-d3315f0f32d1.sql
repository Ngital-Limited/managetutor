-- Add new columns to tutor_profiles
ALTER TABLE public.tutor_profiles ADD COLUMN video_url text;
ALTER TABLE public.tutor_profiles ADD COLUMN teaching_philosophy text;
ALTER TABLE public.tutor_profiles ADD COLUMN success_stories text;

-- Create review update requests table
CREATE TABLE public.review_update_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.tutor_profiles(id) ON DELETE CASCADE,
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tutor_id, review_id)
);

ALTER TABLE public.review_update_requests ENABLE ROW LEVEL SECURITY;

-- Tutors can create requests for their own reviews
CREATE POLICY "Tutors can create review update requests"
ON public.review_update_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tutor_profiles
    WHERE tutor_profiles.id = review_update_requests.tutor_id
    AND tutor_profiles.user_id = auth.uid()
  )
);

-- Tutors can view their own requests
CREATE POLICY "Tutors can view own review update requests"
ON public.review_update_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tutor_profiles
    WHERE tutor_profiles.id = review_update_requests.tutor_id
    AND tutor_profiles.user_id = auth.uid()
  )
);

-- Admins can view all requests
CREATE POLICY "Admins can view all review update requests"
ON public.review_update_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update requests
CREATE POLICY "Admins can update review update requests"
ON public.review_update_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_review_update_requests_updated_at
BEFORE UPDATE ON public.review_update_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();