
-- 1. Internal notes
CREATE TABLE public.internal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  author_id UUID NOT NULL,
  note TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage internal notes"
  ON public.internal_notes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_internal_notes_updated_at
  BEFORE UPDATE ON public.internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_internal_notes_target ON public.internal_notes (target_user_id, created_at DESC);

-- 2. Phone followups
CREATE TABLE public.phone_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  caller_id UUID NOT NULL,
  phone_number TEXT,
  outcome TEXT NOT NULL DEFAULT 'reached',
  summary TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage phone followups"
  ON public.phone_followups FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_phone_followups_target ON public.phone_followups (target_user_id, created_at DESC);
CREATE INDEX idx_phone_followups_pending ON public.phone_followups (follow_up_date) WHERE follow_up_date IS NOT NULL;

-- 3. Activity logs (audit trail)
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_activity_logs_actor ON public.activity_logs (actor_id, created_at DESC);
CREATE INDEX idx_activity_logs_target ON public.activity_logs (target_type, target_id, created_at DESC);
CREATE INDEX idx_activity_logs_action ON public.activity_logs (action, created_at DESC);
