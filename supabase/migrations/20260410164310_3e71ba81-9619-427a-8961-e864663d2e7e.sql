
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Allow inserts from triggers/functions (service role)
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, is_read, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function: notify when a tutor applies to a job
CREATE OR REPLACE FUNCTION public.notify_on_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job_title TEXT;
  _parent_id UUID;
  _tutor_name TEXT;
BEGIN
  SELECT title, parent_id INTO _job_title, _parent_id FROM public.jobs WHERE id = NEW.job_id;
  SELECT p.full_name INTO _tutor_name FROM public.tutor_profiles tp JOIN public.profiles p ON p.id = tp.user_id WHERE tp.id = NEW.tutor_id;

  -- Notify parent about new application
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  VALUES (_parent_id, 'New Application Received', 'A tutor (' || COALESCE(_tutor_name, 'Unknown') || ') applied to your job: ' || COALESCE(_job_title, ''), 'application_received', NEW.job_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_application
AFTER INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_application();

-- Function: notify tutor when application is accepted/rejected
CREATE OR REPLACE FUNCTION public.notify_on_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _job_title TEXT;
  _tutor_user_id UUID;
  _status_label TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('accepted', 'rejected') THEN
    SELECT title INTO _job_title FROM public.jobs WHERE id = NEW.job_id;
    SELECT user_id INTO _tutor_user_id FROM public.tutor_profiles WHERE id = NEW.tutor_id;

    IF NEW.status = 'accepted' THEN
      _status_label := 'Congratulations! You have been selected';
    ELSE
      _status_label := 'Your application was not selected';
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (_tutor_user_id, _status_label, 'For the job: ' || COALESCE(_job_title, ''), 'application_' || NEW.status, NEW.job_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_application_status
AFTER UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_application_status_change();

-- Function: notify tutors in the same district when a new job is posted
CREATE OR REPLACE FUNCTION public.notify_on_new_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  SELECT tp.user_id, 'New Tuition Job Available', 'A new job "' || NEW.title || '" has been posted in your district.', 'new_job', NEW.id
  FROM public.tutor_profiles tp
  WHERE tp.district_id = NEW.district_id AND tp.is_available = true;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_new_job
AFTER INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_job();
