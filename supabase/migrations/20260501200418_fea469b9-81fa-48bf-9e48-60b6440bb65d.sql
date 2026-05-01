
-- Add draft status to job_status enum
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'draft';

-- Add total_views and expires_at columns to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS total_views integer DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Create job_views table
CREATE TABLE IF NOT EXISTS public.job_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  viewer_id uuid,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a job view" ON public.job_views FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins can view all job views" ON public.job_views FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Parents can view own job views" ON public.job_views FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_views.job_id AND jobs.parent_id = auth.uid()));

-- Trigger to increment total_views on jobs
CREATE OR REPLACE FUNCTION public.increment_job_views()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.jobs SET total_views = total_views + 1 WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_job_views
AFTER INSERT ON public.job_views
FOR EACH ROW EXECUTE FUNCTION public.increment_job_views();

-- Create demo_feedback table
CREATE TABLE IF NOT EXISTS public.demo_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_booking_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  tutor_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments text,
  would_recommend boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can create own demo feedback" ON public.demo_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Parents can view own demo feedback" ON public.demo_feedback FOR SELECT TO authenticated USING (auth.uid() = parent_id);
CREATE POLICY "Tutors can view their feedback" ON public.demo_feedback FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tutor_profiles tp WHERE tp.id = demo_feedback.tutor_id AND tp.user_id = auth.uid()));
CREATE POLICY "Admins can manage demo feedback" ON public.demo_feedback FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON public.job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_demo_feedback_demo_id ON public.demo_feedback(demo_booking_id);
